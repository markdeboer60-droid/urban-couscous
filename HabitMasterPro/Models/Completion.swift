import Foundation
import SwiftData

// MARK: - Completion Model
// Registreert één keer dat een gewoonte op een specifieke dag is uitgevoerd.
// date wordt altijd opgeslagen als startOfDay om inconsistenties te voorkomen.

@Model
final class Completion {
    var id: UUID
    var date: Date   // Altijd opgeslagen als startOfDay via Calendar.current
    var habit: Habit? // Inverse relatie naar de Habit (automatisch bijgehouden door SwiftData)

    init(date: Date) {
        self.id = UUID()
        // Sla altijd de startOfDay op zodat datumvergelijkingen consistent zijn.
        // Zo zijn "08:00 op maandag" en "23:59 op maandag" dezelfde completion.
        self.date = Calendar.current.startOfDay(for: date)
    }
}
