package com.stylah.platform.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val CrimsonPrimary = Color(0xFFA81825)
val CrimsonDeep = Color(0xFF820014)
val CrimsonDarkTint = Color(0xFFF26C76)
val CharcoalInk = Color(0xFF202020)
val SurfaceWarm = Color(0xFFFCF9F8)
val SurfaceBase = Color(0xFFFFFFFF)
val SurfaceAlt = Color(0xFFF8F9FA)
val BorderHairline = Color(0xFFE5E7EB)
val DarkBackground = Color(0xFF121010)
val DarkSurface = Color(0xFF1C1919)
val DarkSurfaceAlt = Color(0xFF252121)
val DarkBorder = Color(0xFF332C2C)
val DarkInk = Color(0xFFF5F1F0)
val MpesaGreen = Color(0xFF00A859)
val WhatsAppEmerald = Color(0xFF25D366)
val MutedSlate = Color(0xFF6B7280)

private val StylahLightColorScheme = lightColorScheme(
    primary = CrimsonPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFDAD7),
    onPrimaryContainer = Color(0xFF410006),
    secondary = MpesaGreen,
    onSecondary = Color.White,
    background = SurfaceWarm,
    onBackground = CharcoalInk,
    surface = SurfaceBase,
    onSurface = CharcoalInk,
    surfaceVariant = SurfaceAlt,
    outline = BorderHairline
)

private val StylahDarkColorScheme = darkColorScheme(
    primary = CrimsonDarkTint,
    onPrimary = Color(0xFF410006),
    primaryContainer = CrimsonDeep,
    onPrimaryContainer = Color(0xFFFFDAD7),
    secondary = MpesaGreen,
    onSecondary = Color.White,
    background = DarkBackground,
    onBackground = DarkInk,
    surface = DarkSurface,
    onSurface = DarkInk,
    surfaceVariant = DarkSurfaceAlt,
    outline = DarkBorder
)

@Composable
fun AtelierCrimsonTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) StylahDarkColorScheme else StylahLightColorScheme,
        content = content
    )
}
