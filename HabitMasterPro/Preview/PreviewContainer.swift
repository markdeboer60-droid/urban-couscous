import SwiftUI
import SwiftData

// MARK: - PreviewContainer
// Gebruik deze container in al je #Preview blocks zodat je de UI direct ziet
// in het Xcode Canvas zonder crashes of een lege database.
//
// De container is in-memory (isStoredInMemoryOnly: true), dus er wordt
// niets weggeschreven naar schijf. Elke keer dat het canvas herlaadt,
// begint de data opnieuw.
//
// Gebruik: .modelContainer(PreviewContainer.container)

@MainActor
enum PreviewContainer {

    /// De gedeelde, in-memory ModelContainer gevuld met realistische mock data.
    static let container: ModelContainer = {
        do {
            let container = try ModelContainer(
                for: Habit.self, Completion.self, WeeklyCheckIn.self,
                configurations: ModelConfiguration(isStoredInMemoryOnly: true)
            )
            // Vul de container met mock data op de main context
            insertMockData(into: container.mainContext)
            return container
        } catch {
            fatalError("PreviewContainer kon niet worden aangemaakt: \(error.localizedDescription)")
        }
    }()

    // MARK: - Mock Data Aanmaken

    static func insertMockData(into context: ModelContext) {
        let calendar = Calendar.current
        // Gebruik startOfDay voor consistente datumvergelijking
        let today = calendar.startOfDay(for: Date())

        // Hulpfunctie: maak een datum X dagen geleden
        func daysAgo(_ n: Int) -> Date {
            calendar.date(byAdding: .day, value: -n, to: today) ?? today
        }

        // =====================================================================
        // HABIT 1: Mediteren — doel 5 dagen/week, bijna behaald
        // =====================================================================
        let meditatie = Habit(name: "Mediteren", iconName: "moon.stars", targetFrequency: 5)
        context.insert(meditatie)

        // Completions: 4 van de afgelopen 7 dagen (doel 5 — net niet behaald)
        for offset in [0, 1, 2, 4] {
            let c = Completion(date: daysAgo(offset))
            meditatie.completions.append(c)
            context.insert(c)
        }

        // Streak van 3 (gisteren t/m vandaag, maar ook 2 dagen geleden)
        // Voeg een check-in van vorige week toe (doel WEL behaald)
        let checkIn1 = WeeklyCheckIn(
            date: daysAgo(7),
            reflectionText: "Vorige week was top! Ik heb me rustiger gevoeld na elke sessie.",
            wasGoalMet: true
        )
        meditatie.checkIns.append(checkIn1)
        context.insert(checkIn1)

        // Check-in van 2 weken geleden (doel NIET behaald)
        let checkIn1b = WeeklyCheckIn(
            date: daysAgo(14),
            reflectionText: "Drukke week gehad. Maar ik ga het proberen.",
            wasGoalMet: false
        )
        meditatie.checkIns.append(checkIn1b)
        context.insert(checkIn1b)

        // =====================================================================
        // HABIT 2: Hardlopen — doel 3 dagen/week, doel behaald
        // =====================================================================
        let hardlopen = Habit(name: "Hardlopen", iconName: "figure.run", targetFrequency: 3)
        context.insert(hardlopen)

        // Completions: 3 van de afgelopen 7 dagen (doel exact behaald)
        for offset in [0, 2, 5] {
            let c = Completion(date: daysAgo(offset))
            hardlopen.completions.append(c)
            context.insert(c)
        }

        let checkIn2 = WeeklyCheckIn(
            date: daysAgo(7),
            reflectionText: "5K gelopen! Ik bouw langzaam conditie op.",
            wasGoalMet: true
        )
        hardlopen.checkIns.append(checkIn2)
        context.insert(checkIn2)

        // =====================================================================
        // HABIT 3: Lezen — doel 7 dagen/week (elke dag), perfecte streak
        // =====================================================================
        let lezen = Habit(name: "Lezen", iconName: "book", targetFrequency: 7)
        context.insert(lezen)

        // Completions: alle 7 dagen — perfecte week!
        for offset in 0...6 {
            let c = Completion(date: daysAgo(offset))
            lezen.completions.append(c)
            context.insert(c)
        }

        // Voeg ook completions toe van 7-14 dagen geleden voor een lange streak
        for offset in 7...13 {
            let c = Completion(date: daysAgo(offset))
            lezen.completions.append(c)
            context.insert(c)
        }

        let checkIn3 = WeeklyCheckIn(
            date: daysAgo(7),
            reflectionText: "Elke avond 30 minuten gelezen. Ik ben al 2 boeken door!",
            wasGoalMet: true
        )
        lezen.checkIns.append(checkIn3)
        context.insert(checkIn3)

        // =====================================================================
        // HABIT 4: Water drinken — doel 5 dagen/week, nog maar 2 gedaan
        // =====================================================================
        let water = Habit(name: "Water drinken", iconName: "drop", targetFrequency: 5)
        context.insert(water)

        // Completions: alleen 2 van de 7 dagen (doel niet behaald)
        for offset in [0, 3] {
            let c = Completion(date: daysAgo(offset))
            water.completions.append(c)
            context.insert(c)
        }
        // Geen check-ins voor water — toont de lege staat in HabitDetailView
    }
}
