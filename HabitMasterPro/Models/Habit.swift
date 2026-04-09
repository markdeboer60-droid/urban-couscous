import Foundation
import SwiftData

// MARK: - Habit Model
// Het centrale model dat een gewoonte vertegenwoordigt.
// targetFrequency bepaalt hoeveel dagen per week de gebruiker de gewoonte wil uitvoeren.

@Model
final class Habit {
    var id: UUID
    var name: String
    var iconName: String      // Naam van een SF Symbol, bijv. "flame" of "drop"
    var createdAt: Date
    var targetFrequency: Int  // Doel: 1 t/m 7 dagen per week

    // Cascade delete: als de Habit wordt verwijderd, worden ook alle bijbehorende Completions verwijderd.
    @Relationship(deleteRule: .cascade)
    var completions: [Completion] = []

    // Cascade delete: als de Habit wordt verwijderd, worden ook alle WeeklyCheckIns verwijderd.
    @Relationship(deleteRule: .cascade)
    var checkIns: [WeeklyCheckIn] = []

    init(name: String, iconName: String, targetFrequency: Int) {
        self.id = UUID()
        self.name = name
        self.iconName = iconName
        self.createdAt = Date()
        self.targetFrequency = max(1, min(7, targetFrequency))
    }

    // MARK: - Week Analyse Logica

    /// Geeft alle completions terug die vallen in de afgelopen 7 dagen (inclusief vandaag).
    /// Tip: Calendar.current.date(byAdding: .day, value: -6, to: vandaag) geeft de startdag.
    /// We gebruiken -6 (niet -7) zodat de range van 7 dagen [vandaag-6 ... vandaag] is.
    func completionsLastWeek(from reference: Date = Date()) -> [Completion] {
        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: reference)

        // Bereken het begin van het 7-daagse venster (6 dagen geleden, inclusief vandaag = 7 dagen)
        guard let weekStart = calendar.date(byAdding: .day, value: -6, to: todayStart) else {
            return []
        }

        return completions.filter { completion in
            let completionDay = calendar.startOfDay(for: completion.date)
            // Controleer of de completion binnen het 7-daagse venster valt
            return completionDay >= weekStart && completionDay <= todayStart
        }
    }

    /// Checkt of het wekelijkse doel is behaald: aantal completions >= targetFrequency.
    func isGoalMetThisWeek(from reference: Date = Date()) -> Bool {
        return completionsLastWeek(from: reference).count >= targetFrequency
    }

    /// Checkt of er vandaag al een completion is geregistreerd.
    func isCompletedToday(from reference: Date = Date()) -> Bool {
        let todayStart = Calendar.current.startOfDay(for: reference)
        return completions.contains {
            Calendar.current.startOfDay(for: $0.date) == todayStart
        }
    }

    /// Geeft de voortgang van de huidige week terug als (voltooid, doel).
    func weeklyProgress(from reference: Date = Date()) -> (completed: Int, target: Int) {
        return (completionsLastWeek(from: reference).count, targetFrequency)
    }

    // MARK: - Streak Berekening

    /// Berekent de huidige aaneengesloten streak in dagen.
    /// De streak telt alleen als elke dag opeenvolgend is afgevinkt.
    var currentStreak: Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        // Maak een Set van alle completion-datums voor snelle lookup (O(1) i.p.v. O(n))
        let completionDates = Set(completions.map { calendar.startOfDay(for: $0.date) })

        var streak = 0
        var checkDate = today

        // Als vandaag niet is gedaan, begin dan bij gisteren
        if !completionDates.contains(today) {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: today) else {
                return 0
            }
            checkDate = yesterday
        }

        // Loop terug in de tijd zolang er een completion is op die dag
        while completionDates.contains(checkDate) {
            streak += 1
            guard let previousDay = calendar.date(byAdding: .day, value: -1, to: checkDate) else {
                break
            }
            checkDate = previousDay
        }

        return streak
    }
}
