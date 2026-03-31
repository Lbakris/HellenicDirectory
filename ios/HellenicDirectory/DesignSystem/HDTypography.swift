import SwiftUI

extension Font {
    // Serif (Libre Baskerville) — register in project
    static func hdSerif(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("LibreBaskerville-Regular", size: size)
    }
    static func hdSerifBold(_ size: CGFloat) -> Font {
        .custom("LibreBaskerville-Bold", size: size)
    }

    // Headline presets
    static let hdLargeTitle = Font.hdSerifBold(34)
    static let hdTitle      = Font.hdSerifBold(28)
    static let hdTitle2     = Font.hdSerifBold(22)
    static let hdTitle3     = Font.hdSerif(20, weight: .semibold)
    static let hdHeadline   = Font.hdSerif(17, weight: .semibold)

    // Body uses system font (Inter-equivalent)
    static let hdBody       = Font.system(size: 17)
    static let hdCallout    = Font.system(size: 16)
    static let hdSubhead    = Font.system(size: 15)
    static let hdFootnote   = Font.system(size: 13)
    static let hdCaption    = Font.system(size: 12)
}
