import SwiftUI
import SwiftData

// MARK: - CheckInView
// Het wekelijkse evaluatiescherm. De gebruiker kan:
// - De voortgang van de afgelopen 7 dagen per gewoonte bekijken
// - Een persoonlijke reflectie typen
// - De check-in afronden met haptic feedback
// - Motiverende feedback ontvangen op basis van het behaalde doel

struct CheckInView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    // Haal alle habits op, gesorteerd op aanmaakdatum
    @Query(sort: \Habit.createdAt) private var habits: [Habit]

    // Sla de reflectietekst per habit op (gekeyed op UUID)
    @State private var reflections: [UUID: String] = [:]
    @State private var hasCheckedIn = false
    @State private var feedbackTrigger = false

    // Vastgelegde datum zodat alle berekeningen consistent zijn binnen deze sessie
    private let today = Date()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    headerView

                    if habits.isEmpty {
                        emptyHabitsView
                    } else {
                        ForEach(habits) { habit in
                            habitCheckInCard(for: habit)
                        }

                        if hasCheckedIn {
                            completedView
                        } else {
                            checkInButton
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .navigationTitle("Wekelijkse Check-in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Sluiten") { dismiss() }
                }
            }
        }
        // Haptic feedback triggert als feedbackTrigger verandert
        .sensoryFeedback(.success, trigger: feedbackTrigger)
    }

    // MARK: - Header

    private var headerView: some View {
        VStack(spacing: 10) {
            Image(systemName: "calendar.badge.checkmark")
                .font(.system(size: 52))
                .foregroundStyle(.blue)
                .padding(.top, 8)

            Text("Jouw week in beeld")
                .font(.title2)
                .fontWeight(.bold)

            Text("Analyseer de afgelopen 7 dagen en reflecteer op je voortgang")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 8)
    }

    private var emptyHabitsView: some View {
        VStack(spacing: 12) {
            Image(systemName: "list.bullet.clipboard")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Voeg eerst gewoontes toe om een check-in te doen.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    // MARK: - Habit Check-in Kaart

    private func habitCheckInCard(for habit: Habit) -> some View {
        // Bereken voortgang voor deze habit — de logica zit in het model
        let progress = habit.weeklyProgress(from: today)
        let goalMet = habit.isGoalMetThisWeek(from: today)

        return VStack(alignment: .leading, spacing: 14) {

            // Koptekst: icoon, naam en status-badge
            HStack {
                Image(systemName: habit.iconName)
                    .font(.title2)
                    .foregroundStyle(goalMet ? .green : .blue)

                Text(habit.name)
                    .font(.headline)

                Spacer()

                goalBadge(goalMet: goalMet, progress: progress)
            }

            // 7-dag visueel overzicht
            weekDayIndicators(for: habit)

            // Dynamische motivatietekst op basis van resultaat
            motivationBanner(goalMet: goalMet, habit: habit, progress: progress)

            // Reflectie TextEditor (alleen bewerkbaar vóór check-in)
            reflectionSection(for: habit)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
    }

    // MARK: - Status Badge

    private func goalBadge(goalMet: Bool, progress: (completed: Int, target: Int)) -> some View {
        HStack(spacing: 4) {
            Image(systemName: goalMet ? "checkmark.seal.fill" : "target")
            Text(goalMet ? "Doel behaald!" : "\(progress.completed)/\(progress.target)")
        }
        .font(.caption)
        .fontWeight(.semibold)
        .foregroundStyle(goalMet ? .green : .orange)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background((goalMet ? Color.green : Color.orange).opacity(0.15))
        .clipShape(Capsule())
    }

    // MARK: - 7-dag Indicator

    private func weekDayIndicators(for habit: Habit) -> some View {
        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: today)

        // Genereer de afgelopen 7 dagen (inclusief vandaag).
        // Calendar.current.date(byAdding: .day, value: -6, to: vandaag) = 6 dagen geleden
        // Zo krijg je: [dag-6, dag-5, dag-4, dag-3, dag-2, dag-1, vandaag]
        let days: [Date] = (0...6).compactMap { offset in
            calendar.date(byAdding: .day, value: -(6 - offset), to: todayStart)
        }

        // Maak een Set voor O(1) opzoektijd
        let doneDates = Set(habit.completions.map { calendar.startOfDay(for: $0.date) })

        return HStack(spacing: 0) {
            ForEach(days, id: \.self) { day in
                let isDone = doneDates.contains(day)
                let isToday = calendar.isDateInToday(day)

                VStack(spacing: 3) {
                    // Dag-letter (M, D, W, ...)
                    Text(day.formatted(.dateTime.weekday(.narrow)))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(isToday ? .blue : .secondary)

                    // Rondje: groen = gedaan, lichtgrijs = niet gedaan
                    ZStack {
                        Circle()
                            .fill(isDone ? Color.green : Color(.systemGray5))
                            .frame(width: 32, height: 32)
                        if isDone {
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        if isToday {
                            Circle()
                                .stroke(Color.blue, lineWidth: 2)
                                .frame(width: 32, height: 32)
                        }
                    }

                    // Dag-nummer
                    Text(day.formatted(.dateTime.day()))
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Motivatie Banner

    private func motivationBanner(goalMet: Bool, habit: Habit, progress: (completed: Int, target: Int)) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text(goalMet ? "🎉" : "💪")
                .font(.title2)

            VStack(alignment: .leading, spacing: 3) {
                Text(goalMet ? "Geweldig gedaan!" : "Niet opgeven!")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(goalMet ? .green : .orange)

                // Dynamische tekst afhankelijk van of het doel is gehaald
                Text(goalMet
                     ? motivationalSuccessText(for: habit)
                     : motivationalEncouragementText(for: habit, progress: progress))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background((goalMet ? Color.green : Color.orange).opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // Enthousiaste teksten als het doel WEL behaald is
    private func motivationalSuccessText(for habit: Habit) -> String {
        let options = [
            "Je hebt je doel van \(habit.targetFrequency) dagen behaald! Zo bouw je aan een sterke routine.",
            "Bravo! Week na week zo doorgaan maakt het verschil. Je bent een echte HabitMaster!",
            "Ongelooflijk! Je toont echt doorzettingsvermogen. Blijf zo doorgaan!",
            "Fantastisch resultaat! Deze consistentie is precies wat gewoontes formt."
        ]
        return options.randomElement() ?? options[0]
    }

    // Aanmoedigende teksten als het doel NIET behaald is
    private func motivationalEncouragementText(for habit: Habit, progress: (completed: Int, target: Int)) -> String {
        let options = [
            "Je haalde \(progress.completed) van \(progress.target) dagen. Volgende week lukt het! Elke poging telt.",
            "Geen zorgen — elke week is een nieuwe start. Probeer het opnieuw en maak het haalbaar.",
            "Het gaat niet altijd perfect, en dat is oké. De intentie is er, en dat is wat telt!",
            "Kleine stappen, grote veranderingen. Volgende week pak je het anders aan — jij kan dit!"
        ]
        return options.randomElement() ?? options[0]
    }

    // MARK: - Reflectie sectie

    @ViewBuilder
    private func reflectionSection(for habit: Habit) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Jouw reflectie", systemImage: "pencil.line")
                .font(.caption)
                .foregroundStyle(.secondary)

            if hasCheckedIn {
                // Na check-in: toon opgeslagen tekst (of placeholder)
                let text = reflections[habit.id] ?? ""
                if text.isEmpty {
                    Text("Geen reflectie toegevoegd.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .italic()
                } else {
                    Text(text)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                }
            } else {
                // Vóór check-in: bewerkbare TextEditor
                TextEditor(text: Binding(
                    get: { reflections[habit.id] ?? "" },
                    set: { reflections[habit.id] = $0 }
                ))
                .frame(minHeight: 75, maxHeight: 120)
                .padding(8)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )
                // Placeholder tekst
                .overlay(alignment: .topLeading) {
                    if (reflections[habit.id] ?? "").isEmpty {
                        Text("Hoe ging het deze week? Wat kan beter?")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 16)
                            .allowsHitTesting(false)
                    }
                }
            }
        }
    }

    // MARK: - Check-in Knop

    private var checkInButton: some View {
        Button {
            saveAllCheckIns()
            feedbackTrigger.toggle() // Triggert haptic feedback
            withAnimation(.spring(response: 0.4)) {
                hasCheckedIn = true
            }
        } label: {
            Label("Check-in afronden", systemImage: "checkmark.circle.fill")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
        }
        .buttonStyle(.borderedProminent)
        .padding(.top, 4)
    }

    // MARK: - Afgeronde staat

    private var completedView: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 64))
                .foregroundStyle(.green)
                .symbolEffect(.bounce, value: hasCheckedIn)

            Text("Check-in afgerond! 🙌")
                .font(.title2)
                .fontWeight(.bold)

            Text("Je reflecties zijn opgeslagen.\nTot volgende week!")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("Sluiten") { dismiss() }
                .buttonStyle(.bordered)
                .padding(.top, 4)
        }
        .padding()
    }

    // MARK: - Opslaan

    private func saveAllCheckIns() {
        for habit in habits {
            let goalMet = habit.isGoalMetThisWeek(from: today)
            let reflection = reflections[habit.id] ?? ""

            let checkIn = WeeklyCheckIn(
                date: today,
                reflectionText: reflection,
                wasGoalMet: goalMet
            )
            habit.checkIns.append(checkIn)
            modelContext.insert(checkIn)
        }
    }
}

// MARK: - Preview

#Preview {
    CheckInView()
        .modelContainer(PreviewContainer.container)
}
