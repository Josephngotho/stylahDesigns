package com.stylah.platform.ui

import android.app.Activity
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.stylah.platform.R
import com.stylah.platform.data.BrandDefaults
import com.stylah.platform.data.ServiceItem
import com.stylah.platform.data.formatKsh
import com.stylah.platform.ui.theme.*
import java.net.URLEncoder

@Composable
private fun GoogleGIcon(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.size(18.dp)) {
        val stroke = size.width * 0.2f
        val inset = stroke / 2f
        val arcSize = Size(size.width - stroke, size.height - stroke)
        val topLeft = Offset(inset, inset)
        drawArc(Color(0xFFEA4335), startAngle = 215f, sweepAngle = 100f, useCenter = false, topLeft = topLeft, size = arcSize, style = Stroke(stroke, cap = StrokeCap.Butt))
        drawArc(Color(0xFFFBBC05), startAngle = 140f, sweepAngle = 75f, useCenter = false, topLeft = topLeft, size = arcSize, style = Stroke(stroke, cap = StrokeCap.Butt))
        drawArc(Color(0xFF34A853), startAngle = 45f, sweepAngle = 95f, useCenter = false, topLeft = topLeft, size = arcSize, style = Stroke(stroke, cap = StrokeCap.Butt))
        drawArc(Color(0xFF4285F4), startAngle = -15f, sweepAngle = 60f, useCenter = false, topLeft = topLeft, size = arcSize, style = Stroke(stroke, cap = StrokeCap.Butt))
        drawLine(Color(0xFF4285F4), start = Offset(size.width * 0.52f, size.height * 0.5f), end = Offset(size.width * 0.94f, size.height * 0.5f), strokeWidth = stroke)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StylahApp(vm: StylahViewModel = viewModel()) {
    val state by vm.uiState.collectAsState()
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route ?: "home"
    val uriHandler = LocalUriHandler.current
    val context = LocalContext.current

    val whatsappDigits = state.settings.whatsappNumber.filter { it.isDigit() }.ifBlank {
        BrandDefaults.DEFAULT_WHATSAPP_NUMBER
    }

    AtelierCrimsonTheme(darkTheme = state.isDarkTheme) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            topBar = {
                TopAppBar(
                    title = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.stylah_logo),
                                contentDescription = BrandDefaults.BRAND_NAME,
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(4.dp))
                            )
                            Column {
                                Text(
                                    state.settings.businessName.ifBlank { BrandDefaults.BRAND_NAME },
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    style = MaterialTheme.typography.titleMedium,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    },
                    actions = {
                        IconButton(onClick = { vm.toggleTheme() }) {
                            Icon(
                                imageVector = if (state.isDarkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                                contentDescription = if (state.isDarkTheme) "Light Theme" else "Dark Theme",
                                tint = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
                )
            },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    val encoded = URLEncoder.encode(
                        "Hello ${BrandDefaults.BRAND_NAME}, I would like an interior product or installation enquiry.",
                        "UTF-8"
                    )
                    uriHandler.openUri("https://wa.me/$whatsappDigits?text=$encoded")
                },
                containerColor = WhatsAppEmerald,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Chat, contentDescription = "WhatsApp Stylah Designs & Interiors")
            }
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                val tabs = listOf(
                    Triple("home", "Home", Icons.Default.Home),
                    Triple("shop", "Shop", Icons.Default.Storefront),
                    Triple("cart", "Cart", Icons.Default.ShoppingBag),
                    Triple("services", "Services", Icons.Default.Build),
                    Triple("account", "Account", Icons.Default.Person)
                )
                tabs.forEach { (route, label, icon) ->
                    NavigationBarItem(
                        selected = currentRoute == route,
                        onClick = {
                            navController.navigate(route) {
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            if (route == "cart" && state.cartCount > 0) {
                                BadgedBox(badge = {
                                    Badge(containerColor = CrimsonPrimary) {
                                        Text("${state.cartCount}", color = Color.White)
                                    }
                                }) {
                                    Icon(icon, contentDescription = label)
                                }
                            } else {
                                Icon(icon, contentDescription = label)
                            }
                        },
                        label = { Text(label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            unselectedIconColor = MutedSlate,
                            unselectedTextColor = MutedSlate
                        )
                    )
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (state.settings.announcementActive && state.settings.announcementText.isNotBlank()) {
                Surface(color = CrimsonPrimary, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        state.settings.announcementText,
                        color = Color.White,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }

            state.statusMessage?.let { msg ->
                Surface(color = Color(0xFFE8FBF0), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(msg, color = Color(0xFF005228), modifier = Modifier.weight(1f))
                        TextButton(onClick = { vm.clearBanner() }) { Text("Dismiss") }
                    }
                }
            }
            state.errorMessage?.let { err ->
                Surface(color = Color(0xFFFFDAD6), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(err, color = Color(0xFF93000A), modifier = Modifier.weight(1f))
                        TextButton(onClick = { vm.clearBanner() }) { Text("Dismiss") }
                    }
                }
            }

            NavHost(navController = navController, startDestination = "home") {
                composable("home") {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceBase),
                                border = BorderStroke(1.dp, BorderHairline),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(state.settings.heroKicker, color = CrimsonPrimary, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelLarge)
                                    Text(state.settings.heroHeadline, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                    Text(state.settings.heroSubtitle, style = MaterialTheme.typography.bodySmall, color = MutedSlate)
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(
                                            onClick = { navController.navigate("shop") },
                                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(state.settings.heroPrimaryCta)
                                        }
                                        OutlinedButton(
                                            onClick = { navController.navigate("services") },
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(state.settings.heroSecondaryCta, color = CharcoalInk)
                                        }
                                    }
                                }
                            }
                        }
                        items(state.products.take(4)) { product ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceBase),
                                border = BorderStroke(1.dp, BorderHairline),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    AsyncImage(
                                        model = product.imageUrls.firstOrNull(),
                                        contentDescription = product.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(88.dp).clip(RoundedCornerShape(6.dp))
                                    )
                                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(product.categoryName, style = MaterialTheme.typography.labelSmall, color = MutedSlate)
                                        Text(product.name, fontWeight = FontWeight.SemiBold)
                                        Text(formatKsh(product.activePriceKsh), fontWeight = FontWeight.Bold)
                                        Button(
                                            onClick = { vm.addToCart(product) },
                                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                                            shape = RoundedCornerShape(4.dp)
                                        ) { Text("Add to Cart") }
                                    }
                                }
                            }
                        }
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(state.settings.businessName, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                    Text(state.settings.tagline, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                                    Text("Email: ${state.settings.supportEmail}", style = MaterialTheme.typography.bodySmall, color = MutedSlate)
                                    Text("WhatsApp: +$whatsappDigits", style = MaterialTheme.typography.bodySmall, color = MutedSlate)
                                    if (state.settings.facebookUrl.isNotBlank() || state.settings.instagramUrl.isNotBlank() || state.settings.tiktokUrl.isNotBlank()) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            if (state.settings.facebookUrl.isNotBlank()) {
                                                OutlinedButton(onClick = { uriHandler.openUri(state.settings.facebookUrl) }) {
                                                    Text("Facebook")
                                                }
                                            }
                                            if (state.settings.instagramUrl.isNotBlank()) {
                                                OutlinedButton(onClick = { uriHandler.openUri(state.settings.instagramUrl) }) {
                                                    Text("Instagram")
                                                }
                                            }
                                            if (state.settings.tiktokUrl.isNotBlank()) {
                                                OutlinedButton(onClick = { uriHandler.openUri(state.settings.tiktokUrl) }) {
                                                    Text("TikTok")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                composable("shop") {
                    var query by remember { mutableStateOf("") }
                    val filtered = state.products.filter {
                        query.isBlank() || it.name.contains(query, ignoreCase = true) || it.categoryName.contains(query, ignoreCase = true)
                    }
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            OutlinedTextField(
                                value = query,
                                onValueChange = { query = it },
                                label = { Text("Search wallpapers, lighting, CCTV...") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        items(filtered) { product ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceBase),
                                border = BorderStroke(1.dp, BorderHairline),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("${product.categoryName} · Stock ${product.stockQty}", style = MaterialTheme.typography.labelSmall, color = MutedSlate)
                                    Text(product.name, fontWeight = FontWeight.SemiBold)
                                    Text(product.description, maxLines = 2, style = MaterialTheme.typography.bodySmall)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text(formatKsh(product.activePriceKsh), fontWeight = FontWeight.Bold)
                                        Button(
                                            onClick = { vm.addToCart(product) },
                                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                                            shape = RoundedCornerShape(4.dp)
                                        ) { Text("Add") }
                                    }
                                }
                            }
                        }
                    }
                }

                composable("cart") {
                    var name by remember { mutableStateOf("") }
                    var phone by remember { mutableStateOf("") }
                    var town by remember { mutableStateOf("Nairobi") }
                    var address by remember { mutableStateOf("") }
                    var promoCode by remember { mutableStateOf("") }

                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(state.cart) { item ->
                            Card(border = BorderStroke(1.dp, BorderHairline), colors = CardDefaults.cardColors(containerColor = SurfaceBase)) {
                                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.productName, fontWeight = FontWeight.SemiBold)
                                        Text(formatKsh(item.unitPriceKsh * item.quantity), fontWeight = FontWeight.Bold)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        IconButton(onClick = { vm.updateCartQuantity(item.productId, item.quantity - 1) }) { Text("-") }
                                        Text("${item.quantity}")
                                        IconButton(onClick = { vm.updateCartQuantity(item.productId, item.quantity + 1) }) { Text("+") }
                                    }
                                }
                            }
                        }
                        if (state.cart.isNotEmpty()) {
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("Subtotal: ${formatKsh(state.cartSubtotalKsh)}", fontWeight = FontWeight.Bold)
                                    OutlinedTextField(value = promoCode, onValueChange = { promoCode = it.uppercase() }, label = { Text("Promo Code (Optional, e.g. STYLAH10)") }, modifier = Modifier.fillMaxWidth())
                                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth())
                                    OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("M-Pesa Phone (+2547...)") }, modifier = Modifier.fillMaxWidth())
                                    OutlinedTextField(value = town, onValueChange = { town = it }, label = { Text("Town / County") }, modifier = Modifier.fillMaxWidth())
                                    OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Street / Estate") }, modifier = Modifier.fillMaxWidth())
                                    Button(
                                        enabled = state.user != null && !state.loading,
                                        onClick = { vm.checkoutWithMpesa(name, phone, town, address, promoCode) },
                                        colors = ButtonDefaults.buttonColors(containerColor = MpesaGreen),
                                        modifier = Modifier.fillMaxWidth().height(48.dp),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(if (state.user == null) "Sign In on Account Tab First" else "Pay via M-Pesa")
                                    }
                                }
                            }
                        } else {
                            item { Text("Your cart is empty.") }
                        }
                    }
                }

                composable("services") {
                    var selectedService by remember(state.services) { mutableStateOf<ServiceItem?>(state.services.firstOrNull()) }
                    var name by remember { mutableStateOf("") }
                    var phone by remember { mutableStateOf("") }
                    var town by remember { mutableStateOf("Nairobi") }
                    var date by remember { mutableStateOf("2026-12-01") }
                    var desc by remember { mutableStateOf("") }
                    var photoUri by remember { mutableStateOf<Uri?>(null) }

                    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
                        photoUri = uri
                    }

                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(state.services) { svc ->
                            Card(
                                onClick = { selectedService = svc },
                                border = BorderStroke(1.dp, if (selectedService?.id == svc.id) CrimsonPrimary else BorderHairline),
                                colors = CardDefaults.cardColors(containerColor = SurfaceBase)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(svc.category, style = MaterialTheme.typography.labelSmall, color = MutedSlate)
                                    Text(svc.title, fontWeight = FontWeight.SemiBold)
                                    Text(svc.description, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Kenyan Phone (+2547...)") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = town, onValueChange = { town = it }, label = { Text("Location / Town") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = date, onValueChange = { date = it }, label = { Text("Preferred Date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("Project Scope") }, modifier = Modifier.fillMaxWidth())
                                OutlinedButton(
                                    onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(if (photoUri != null) "Site Photo Selected" else "Attach Site Photo")
                                }
                                Button(
                                    enabled = state.user != null && selectedService != null && !state.loading,
                                    onClick = { selectedService?.let { vm.submitBooking(name, phone, town, it, desc, date, photoUri) } },
                                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                                    modifier = Modifier.fillMaxWidth().height(48.dp)
                                ) {
                                    Text("Submit Booking Request")
                                }
                            }
                        }
                    }
                }

                composable("account") {
                    var email by remember { mutableStateOf("") }
                    var password by remember { mutableStateOf("") }
                    var fullName by remember { mutableStateOf("") }
                    var isRegister by remember { mutableStateOf(false) }
                    var showForgotPassword by remember { mutableStateOf(false) }

                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (state.user == null) {
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Image(
                                            painter = painterResource(id = R.drawable.stylah_logo),
                                            contentDescription = BrandDefaults.BRAND_NAME,
                                            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(6.dp))
                                        )
                                        Column {
                                            Text(BrandDefaults.BRAND_NAME, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                            Text(BrandDefaults.BRAND_TAGLINE, style = MaterialTheme.typography.bodySmall, color = MutedSlate)
                                        }
                                    }

                                    // Two-option segmented toggle ONLY: Sign In | Register (no Reset tab)
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        Button(
                                            onClick = { isRegister = false; showForgotPassword = false },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (!isRegister) CrimsonPrimary else SurfaceAlt,
                                                contentColor = if (!isRegister) Color.White else CharcoalInk
                                            ),
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(6.dp)
                                        ) { Text("Sign In") }
                                        Button(
                                            onClick = { isRegister = true; showForgotPassword = false },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (isRegister) CrimsonPrimary else SurfaceAlt,
                                                contentColor = if (isRegister) Color.White else CharcoalInk
                                            ),
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(6.dp)
                                        ) { Text("Register") }
                                    }

                                    if (showForgotPassword && !isRegister) {
                                        Text("Reset Your Password", fontWeight = FontWeight.SemiBold)
                                        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Account Email") }, modifier = Modifier.fillMaxWidth())
                                        Button(
                                            enabled = !state.loading,
                                            onClick = { vm.sendPasswordReset(email) },
                                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                        ) { Text("Send Reset Link") }
                                        TextButton(onClick = { showForgotPassword = false }) {
                                            Text("Back to Sign In", color = CrimsonPrimary)
                                        }
                                    } else {
                                        if (isRegister) {
                                            OutlinedTextField(value = fullName, onValueChange = { fullName = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth())
                                        }
                                        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
                                        OutlinedTextField(
                                            value = password,
                                            onValueChange = { password = it },
                                            label = { Text("Password") },
                                            visualTransformation = PasswordVisualTransformation(),
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        if (!isRegister) {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                                                TextButton(onClick = { showForgotPassword = true }) {
                                                    Text("Forgot password?", color = CrimsonPrimary)
                                                }
                                            }
                                        }
                                        Button(
                                            enabled = !state.loading,
                                            onClick = { if (isRegister) vm.register(fullName, email, password) else vm.signIn(email, password) },
                                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                        ) {
                                            Text(if (isRegister) "Create Account" else "Sign In")
                                        }

                                        HorizontalDivider()

                                        OutlinedButton(
                                            enabled = !state.loading,
                                            onClick = { (context as? Activity)?.let { vm.signInWithGoogle(it) } },
                                            modifier = Modifier.fillMaxWidth().height(48.dp),
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            GoogleGIcon()
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Text("Continue with Google", color = CharcoalInk, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                }
                            }
                        } else {
                            item {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text(state.user?.email ?: "Signed In", fontWeight = FontWeight.SemiBold)
                                    OutlinedButton(onClick = { vm.signOut() }) { Text("Sign Out") }
                                }
                            }
                            item { Text("Orders (${state.orders.size})", fontWeight = FontWeight.Bold) }
                            items(state.orders) { ord ->
                                Card(border = BorderStroke(1.dp, BorderHairline), colors = CardDefaults.cardColors(containerColor = SurfaceBase)) {
                                    Column(modifier = Modifier.padding(12.dp).fillMaxWidth()) {
                                        Text("${ord.orderRef} · ${formatKsh(ord.totalKsh)}", fontWeight = FontWeight.Bold)
                                        Text("${ord.orderStatus} · Payment: ${ord.paymentStatus}", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                            item { Text("Bookings (${state.bookings.size})", fontWeight = FontWeight.Bold) }
                            items(state.bookings) { bk ->
                                Card(border = BorderStroke(1.dp, BorderHairline), colors = CardDefaults.cardColors(containerColor = SurfaceBase)) {
                                    Column(modifier = Modifier.padding(12.dp).fillMaxWidth()) {
                                        Text("${bk.bookingRef} · ${bk.serviceTitle}", fontWeight = FontWeight.Bold)
                                        Text("${bk.locationTown} · ${bk.status}", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        }
    }
}
