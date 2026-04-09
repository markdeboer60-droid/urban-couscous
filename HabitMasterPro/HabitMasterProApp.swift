import SwiftUI
import SwiftData

// MARK: - App Entry Point
// Dit is het startpunt van de app. De @main annotatie vertelt Swift dat dit de hoofdstructuur is.
//
// ModelContainer opzetten:
// - .modelContainer(for:) is een SwiftUI modifier die de database aanmaakt en beheert.
// - Je geeft alle @Model types mee zodat SwiftData het schema kent.
// - SwiftData maakt automatisch een SQLite database aan in de app's Application Support map.
// - De container is beschikbaar in alle child-views via @Environment(\.modelContext).

@main
struct HabitMasterProApp: App {
    var body: some Scene {
        WindowGroup {
            HabitListView()
        }
        // Registreer alle SwiftData modellen in één ModelContainer.
        // De volgorde maakt niet uit; SwiftData regelt de relaties automatisch.
        .modelContainer(for: [
            Habit.self,
            Completion.self,
            WeeklyCheckIn.self
        ])
    }
}
