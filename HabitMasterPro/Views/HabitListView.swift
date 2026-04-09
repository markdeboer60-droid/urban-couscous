import SwiftUI
import SwiftData

// MARK: - HabitListView
// Het hoofdscherm van de app. Toont een lijst van alle gewoontes met:
// - Icoon + naam
// - Voortgangsindicator voor de huidige week (bijv. "2 van de 3 dagen")
// - Dagelijkse voltooiingsknop met haptic feedback
// - Navigatie naar detail en check-in schermen

struct HabitListView: View {
    @Environment(\.modelContext) private var modelContext
    // @Query haalt automatisch alle Habits op uit SwiftData, gesorteerd op aanmaakdatum.
    // De view herlaadt automatisch als de data verandert.
    @Query(sort: \Habit.createdAt, order: .forward) private var habits: [Habit]

    @State private var showingAddHabit = false
    @State private var showingCheckIn = false

    var body: some View {
        NavigationStack {
            Group {
                if habits.isEmpty {
                    emptyStateView
                } else {
                    habitList
                }
            }
            .navigationTitle("HabitMaster Pro")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        showingCheckIn = true
                    } label: {
                        Label("Wekelijkse Check-in", systemImage: "calendar.badge.checkmark")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingAddHabit = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.semibold)
                    }
                }
            }
            .sheet(isPresented: $showingAddHabit) {
                AddHabitView()
            }
            .sheet(isPresented: $showingCheckIn) {
                CheckInView()
            }
        }
    }

    // MARK: - Lijst

    private var habitList: some View {
        List {
            ForEach(habits) { habit in
                NavigationLink(destination: HabitDetailView(habit: habit)) {
                    HabitRowView(habit: habit) {
                        toggleCompletion(for: habit)
                    }
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                .listRowSeparator(.hidden)
            }
            .onDelete(perform: deleteHabits)
        }
        .listStyle(.plain)
    }

    // MARK: - Lege staat

    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("Geen gewoontes", systemImage: "star.circle")
        } description: {
            Text("Voeg je eerste gewoonte toe en begin met bouwen aan een betere jij!")
        } actions: {
            Button {
                showingAddHabit = true
            } label: {
                Label("Gewoonte toevoegen", systemImage: "plus.circle.fill")
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Acties

    private func toggleCompletion(for habit: Habit) {
        let today = Calendar.current.startOfDay(for: Date())

        if habit.isCompletedToday() {
            // Verwijder de completion van vandaag
            if let existing = habit.completions.first(where: {
                Calendar.current.startOfDay(for: $0.date) == today
            }) {
                modelContext.delete(existing)
            }
        } else {
            // Voeg een nieuwe completion toe voor vandaag
            let completion = Completion(date: Date())
            habit.completions.append(completion)
            modelContext.insert(completion)
        }
    }

    private func deleteHabits(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(habits[index])
        }
    }
}

// MARK: - HabitRowView
// Een enkele rij in de lijst. Ontvangt een closure voor de voltooiingsactie
// zodat de modelContext logica in de parent view blijft.

struct HabitRowView: View {
    let habit: Habit
    let onComplete: () -> Void

    // State om de sensoryFeedback te triggeren (moet veranderen om te triggeren)
    @State private var feedbackTrigger = false

    var body: some View {
        HStack(spacing: 14) {

            // MARK: Icoon
            ZStack {
                Circle()
                    .fill(habit.isCompletedToday() ? Color.green.opacity(0.15) : Color.blue.opacity(0.1))
                    .frame(width: 52, height: 52)
                Image(systemName: habit.iconName)
                    .font(.title2)
                    .foregroundStyle(habit.isCompletedToday() ? .green : .blue)
            }
            .animation(.spring(response: 0.3), value: habit.isCompletedToday())

            // MARK: Naam en voortgang
            VStack(alignment: .leading, spacing: 5) {
                Text(habit.name)
                    .font(.headline)

                let progress = habit.weeklyProgress()

                // Voortgangstekst
                HStack(spacing: 6) {
                    Text("\(progress.completed) van \(progress.target) dagen")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    // Toon streak alleen als > 1 dag
                    if habit.currentStreak > 1 {
                        Label("\(habit.currentStreak)", systemImage: "flame.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }

                // Voortgangsbalk: groen als doel behaald, anders blauw
                ProgressView(
                    value: Double(min(progress.completed, progress.target)),
                    total: Double(progress.target)
                )
                .tint(progress.completed >= progress.target ? .green : .blue)
                .frame(maxWidth: 180)
                .animation(.easeInOut, value: progress.completed)
            }

            Spacer()

            // MARK: Voltooiingsknop
            Button {
                feedbackTrigger.toggle() // Verandering triggert de haptic
                onComplete()
            } label: {
                Image(systemName: habit.isCompletedToday() ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 28))
                    .foregroundStyle(habit.isCompletedToday() ? .green : Color(.systemGray4))
                    .animation(.spring(response: 0.25, dampingFraction: 0.6), value: habit.isCompletedToday())
            }
            .buttonStyle(.plain)
            // sensoryFeedback triggert telkens als feedbackTrigger verandert (iOS 17+)
            .sensoryFeedback(.success, trigger: feedbackTrigger)
        }
        .padding(.vertical, 6)
    }
}

// MARK: - Preview

#Preview("Lijst met data") {
    HabitListView()
        .modelContainer(PreviewContainer.container)
}

#Preview("Lege lijst") {
    HabitListView()
        .modelContainer(try! ModelContainer(
            for: Habit.self, Completion.self, WeeklyCheckIn.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        ))
}
