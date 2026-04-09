import SwiftUI
import SwiftData

// MARK: - HabitDetailView
// Detailscherm voor één gewoonte. Toont:
// - Habit header (icoon, naam, aanmaakdatum)
// - Kalenderoverzicht van de huidige week
// - Statistieken (streak, totaal, check-ins)
// - Geschiedenis van wekelijkse check-ins
//
// De view is volledig scrollbaar zodat hij ook in landscape mode prettig werkt.

struct HabitDetailView: View {
    let habit: Habit

    private let calendar = Calendar.current
    private let today = Date()

    var body: some View {
        // ScrollView maakt de view bruikbaar in landscape mode
        // zonder dat content wordt afgesneden
        ScrollView {
            VStack(spacing: 16) {
                headerCard
                weekCalendarCard
                statsRow
                checkInHistoryCard
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .navigationTitle(habit.name)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Header Kaart

    private var headerCard: some View {
        HStack(spacing: 16) {
            // Icoon in cirkel
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.12))
                    .frame(width: 72, height: 72)
                Image(systemName: habit.iconName)
                    .font(.system(size: 32))
                    .foregroundStyle(.blue)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(habit.name)
                    .font(.title2)
                    .fontWeight(.bold)

                HStack {
                    Image(systemName: "target")
                        .foregroundStyle(.secondary)
                    Text("Doel: \(habit.targetFrequency) \(habit.targetFrequency == 1 ? "dag" : "dagen") per week")
                        .foregroundStyle(.secondary)
                }
                .font(.subheadline)

                HStack {
                    Image(systemName: "calendar")
                        .foregroundStyle(.secondary)
                    Text("Gestart \(habit.createdAt.formatted(.dateTime.day().month(.wide).year()))")
                        .foregroundStyle(.secondary)
                }
                .font(.caption)
            }

            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
    }

    // MARK: - Week Kalender Kaart

    private var weekCalendarCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Huidige week", systemImage: "calendar")
                    .font(.headline)
                Spacer()
                // Voortgang als tekst
                let progress = habit.weeklyProgress(from: today)
                Text("\(progress.completed)/\(progress.target) dagen")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(progress.completed >= progress.target ? .green : .secondary)
            }

            weekDayGrid

            // Voortgangsbalk
            let progress = habit.weeklyProgress(from: today)
            ProgressView(
                value: Double(min(progress.completed, progress.target)),
                total: Double(progress.target)
            )
            .tint(progress.completed >= progress.target ? .green : .blue)
            .animation(.easeInOut, value: progress.completed)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
    }

    private var weekDayGrid: some View {
        let todayStart = calendar.startOfDay(for: today)

        // De afgelopen 7 dagen inclusief vandaag.
        // Calendar.current.date(byAdding: .day, value: -(6 - offset), to: vandaag):
        // offset 0 → vandaag-6 (= 6 dagen geleden)
        // offset 6 → vandaag
        let days: [Date] = (0...6).compactMap { offset in
            calendar.date(byAdding: .day, value: -(6 - offset), to: todayStart)
        }

        // Set voor snelle opzoektijd
        let doneDates = Set(habit.completions.map { calendar.startOfDay(for: $0.date) })

        return HStack(spacing: 4) {
            ForEach(days, id: \.self) { day in
                let isDone = doneDates.contains(day)
                let isToday = calendar.isDateInToday(day)

                VStack(spacing: 4) {
                    // Weekdag afkorting
                    Text(day.formatted(.dateTime.weekday(.narrow)))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(isToday ? .blue : .secondary)

                    // Cirkel indicator
                    ZStack {
                        Circle()
                            .fill(isDone ? Color.green : (isToday ? Color.blue.opacity(0.08) : Color(.systemGray5)))
                            .frame(width: 36, height: 36)

                        if isDone {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                        } else if isToday {
                            Circle()
                                .stroke(Color.blue, lineWidth: 2)
                                .frame(width: 36, height: 36)
                        }
                    }

                    // Dag-nummer
                    Text(day.formatted(.dateTime.day()))
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Statistieken Rij

    private var statsRow: some View {
        HStack(spacing: 12) {
            statCard(
                icon: "flame.fill",
                color: .orange,
                value: "\(habit.currentStreak)",
                label: "Streak",
                unit: "dagen"
            )
            statCard(
                icon: "checkmark.circle.fill",
                color: .green,
                value: "\(habit.completions.count)",
                label: "Totaal",
                unit: "keer"
            )
            statCard(
                icon: "calendar.badge.checkmark",
                color: .blue,
                value: "\(habit.checkIns.count)",
                label: "Check-ins",
                unit: "weken"
            )
        }
    }

    private func statCard(icon: String, color: Color, value: String, label: String, unit: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
            Text(unit)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(label)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
    }

    // MARK: - Check-in Geschiedenis

    private var checkInHistoryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Check-in geschiedenis", systemImage: "clock.arrow.trianglehead.counterclockwise.rotate.90")
                .font(.headline)

            if habit.checkIns.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("Nog geen check-ins gedaan.\nKom elke week terug om te reflecteren!")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                // Sorteer check-ins van nieuw naar oud
                let sorted = habit.checkIns.sorted { $0.date > $1.date }
                ForEach(sorted) { checkIn in
                    checkInRow(checkIn)
                    if checkIn.id != sorted.last?.id {
                        Divider()
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
    }

    private func checkInRow(_ checkIn: WeeklyCheckIn) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center) {
                // Icoon: vinkje of kruisje
                Image(systemName: checkIn.wasGoalMet ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .foregroundStyle(checkIn.wasGoalMet ? .green : Color(.systemGray3))
                    .font(.title3)

                VStack(alignment: .leading, spacing: 2) {
                    Text(checkIn.date.formatted(.dateTime.day().month(.wide).year()))
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Text(checkIn.wasGoalMet ? "Doel behaald ✓" : "Doel niet behaald")
                        .font(.caption)
                        .foregroundStyle(checkIn.wasGoalMet ? .green : .secondary)
                }

                Spacer()
            }

            // Reflectietekst (als die er is)
            if !checkIn.reflectionText.isEmpty {
                Text(checkIn.reflectionText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        HabitDetailView(habit: {
            let container = PreviewContainer.container
            // Haal de eerste habit op uit de preview container
            let descriptor = FetchDescriptor<Habit>(sortBy: [SortDescriptor(\.createdAt)])
            return try! container.mainContext.fetch(descriptor).first!
        }())
    }
    .modelContainer(PreviewContainer.container)
}
