package com.stylah.platform

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.stylah.platform.ui.StylahApp
import com.stylah.platform.ui.theme.AtelierCrimsonTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AtelierCrimsonTheme {
                StylahApp()
            }
        }
    }
}
