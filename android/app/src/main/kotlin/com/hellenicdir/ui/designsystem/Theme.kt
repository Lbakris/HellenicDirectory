package com.hellenicdir.ui.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Brand Colors
val HDNavy = Color(0xFF1B2A4A)
val HDNavyLight = Color(0xFF2E4470)
val HDGold = Color(0xFFC9A84C)
val HDGoldLight = Color(0xFFD4B565)
val HDCream = Color(0xFFF5EDD8)
val HDCharcoal = Color(0xFF2D2D2D)
val HDMuted = Color(0xFF7C849A)
val HDCard = Color(0xFFFFFFFF)
val HDCardDark = Color(0xFF1B2A4A)
val HDBackgroundDark = Color(0xFF141E33)

private val LightColorScheme = lightColorScheme(
    primary = HDNavy,
    onPrimary = HDGold,
    primaryContainer = HDNavy.copy(alpha = 0.08f),
    secondary = HDGold,
    onSecondary = HDNavy,
    background = HDCream,
    onBackground = HDNavy,
    surface = HDCard,
    onSurface = HDCharcoal,
    surfaceVariant = Color(0xFFF0E9D8),
    outline = HDMuted.copy(alpha = 0.4f),
    error = Color(0xFFD32F2F)
)

private val DarkColorScheme = darkColorScheme(
    primary = HDGold,
    onPrimary = HDNavy,
    primaryContainer = HDNavyLight,
    secondary = HDGoldLight,
    onSecondary = HDNavy,
    background = HDBackgroundDark,
    onBackground = HDCream,
    surface = HDCardDark,
    onSurface = HDCream,
    surfaceVariant = HDNavyLight,
    outline = HDMuted.copy(alpha = 0.5f),
    error = Color(0xFFEF9A9A)
)

// Note: Add LibreBaskerville font files to res/font/ and reference here
// val LibreBaskerville = FontFamily(
//     Font(R.font.libre_baskerville_regular),
//     Font(R.font.libre_baskerville_bold, FontWeight.Bold)
// )

@Composable
fun HellenicDirectoryTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colors,
        typography = HDTypography,
        content = content
    )
}

val HDTypography = androidx.compose.material3.Typography(
    headlineLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 34.sp, lineHeight = 42.sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 36.sp),
    headlineSmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 30.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 17.sp),
    bodyLarge = TextStyle(fontSize = 17.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 22.sp),
    labelSmall = TextStyle(fontSize = 12.sp),
    labelMedium = TextStyle(fontSize = 13.sp)
)
