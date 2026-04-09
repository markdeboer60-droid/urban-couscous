import SwiftUI
import SwiftData

// MARK: - AddHabitView
// Een sheet waarmee de gebruiker een nieuwe gewoonte aanmaakt.
// Bevat:
// - TextField voor de naam
// - Picker voor de wekelijkse frequentie (1-7 dagen)
// - SF Symbol icoonkiezer als een raster (LazyVGrid)
// - Live-preview van het resultaat

struct AddHabitView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var targetFrequency = 3
    @State private var selectedIcon = "flame"

    // De beschikbare SF Symbols waaruit de gebruiker kan kiezen.
    // Voeg hier gerust meer symbolen aan toe!
    let availableIcons: [String] = [
        "flame",        "drop",         "figure.run",   "book",         "heart",
        "star",         "bolt",         "leaf",         "moon.stars",   "sun.max",
        "dumbbell",     "fork.knife",   "music.note",   "paintbrush",   "keyboard",
        "bicycle",      "figure.yoga",  "bed.double",   "cup.and.heat.waves", "pills"
    ]

    var body: some View {
        NavigationStack {
            Form {

                // MARK: Naam
                Section("Naam van de gewoonte") {
                    TextField("Bijv. Dagelijks mediteren", text: $name)
                        .autocorrectionDisabled()
                }

                // MARK: Frequentie Picker
                Section {
                    Picker("Dagen per week", selection: $targetFrequency) {
                        ForEach(1...7, id: \.self) { days in
                            Text("\(days) \(days == 1 ? "dag" : "dagen") per week")
                                .tag(days)
                        }
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text("Wekelijks doel")
                } footer: {
                    Text("Hoe vaak wil je deze gewoonte per week uitvoeren?")
                }

                // MARK: Icoon Raster (SF Symbols)
                Section("Kies een icoon") {
                    // LazyVGrid laadt cellen lui in — efficiënt voor grote rasters
                    LazyVGrid(
                        columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 5),
                        spacing: 12
                    ) {
                        ForEach(availableIcons, id: \.self) { icon in
                            iconButton(for: icon)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // MARK: Live preview
                Section("Voorbeeld") {
                    HStack(spacing: 14) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.12))
                                .frame(width: 46, height: 46)
                            Image(systemName: selectedIcon)
                                .font(.title2)
                                .foregroundStyle(.blue)
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text(name.trimmingCharacters(in: .whitespaces).isEmpty
                                 ? "Naam van je gewoonte"
                                 : name)
                                .font(.headline)
                                .foregroundStyle(name.isEmpty ? .secondary : .primary)
                            Text("\(targetFrequency) \(targetFrequency == 1 ? "dag" : "dagen") per week")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Nieuwe Gewoonte")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuleren") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Opslaan") {
                        saveHabit()
                    }
                    // De knop is alleen actief als de naam niet leeg is
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    // MARK: - Icoonknop

    private func iconButton(for icon: String) -> some View {
        Button {
            withAnimation(.spring(response: 0.25, dampingFraction: 0.6)) {
                selectedIcon = icon
            }
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(selectedIcon == icon ? Color.blue : Color(.systemGray6))
                    .frame(width: 54, height: 54)
                    // Rand om geselecteerd icoon
                    .overlay {
                        if selectedIcon == icon {
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.blue, lineWidth: 2)
                        }
                    }
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(selectedIcon == icon ? .white : .primary)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Opslaan

    private func saveHabit() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { return }

        let habit = Habit(
            name: trimmedName,
            iconName: selectedIcon,
            targetFrequency: targetFrequency
        )
        modelContext.insert(habit)
        dismiss()
    }
}

// MARK: - Preview

#Preview {
    AddHabitView()
        .modelContainer(PreviewContainer.container)
}
