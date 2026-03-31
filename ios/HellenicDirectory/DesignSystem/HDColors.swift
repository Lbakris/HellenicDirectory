import SwiftUI

extension Color {
    // Brand palette
    static let hdNavy       = Color("HDNavy")       // #1B2A4A
    static let hdGold       = Color("HDGold")       // #C9A84C
    static let hdCream      = Color("HDCream")      // #F5EDD8
    static let hdNavyLight  = Color("HDNavyLight")  // #2E4470 (card backgrounds in dark)
    static let hdCharcoal   = Color("HDCharcoal")   // #2D2D2D

    // Semantic aliases
    static let hdPrimary    = Color.hdNavy
    static let hdAccent     = Color.hdGold
    static let hdBackground = Color("HDBackground")
    static let hdCard       = Color("HDCard")
    static let hdMuted      = Color("HDMuted")
}

// Use in Assets.xcassets — Color Sets for light/dark mode:
// HDNavy:       light=#1B2A4A  dark=#1B2A4A
// HDGold:       light=#C9A84C  dark=#D4B565
// HDCream:      light=#F5EDD8  dark=#2E4470
// HDBackground: light=#F5EDD8  dark=#141E33
// HDCard:       light=#FFFFFF  dark=#1B2A4A
// HDMuted:      light=#7C849A  dark=#9FAFC9
// HDCharcoal:   light=#2D2D2D  dark=#E8ECF4
