import Foundation
import SwiftData

// MARK: - WeeklyCheckIn Model
// Slaat de wekelijkse evaluatie op van een gewoonte.
// Een gebruiker kan één keer per week reflecteren op zijn voortgang.

@Model
final class WeeklyCheckIn {
    var id: UUID
    var date: Date             // Datum van de check-in
    var reflectionText: String // Korte persoonlijke notitie van de gebruiker
    var wasGoalMet: Bool       // true als targetFrequency werd behaald die week
    var habit: Habit?          // Inverse relatie naar de Habit

    init(date: Date, reflectionText: String, wasGoalMet: Bool) {
        self.id = UUID()
        self.date = date
        self.reflectionText = reflectionText
        self.wasGoalMet = wasGoalMet
    }
}
