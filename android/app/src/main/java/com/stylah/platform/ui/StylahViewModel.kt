package com.stylah.platform.ui

import android.app.Activity
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import com.stylah.platform.data.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class StylahUiState(
    val user: FirebaseUser? = null,
    val settings: PublicSettings = PublicSettings(),
    val promotions: List<Promotion> = emptyList(),
    val products: List<Product> = emptyList(),
    val services: List<ServiceItem> = emptyList(),
    val cart: List<CartItem> = emptyList(),
    val orders: List<OrderSummary> = emptyList(),
    val bookings: List<BookingSummary> = emptyList(),
    val loading: Boolean = false,
    val isDarkTheme: Boolean = false,
    val statusMessage: String? = null,
    val errorMessage: String? = null
) {
    val cartCount: Int get() = cart.sumOf { it.quantity }
    val cartSubtotalKsh: Double get() = cart.sumOf { it.unitPriceKsh * it.quantity }
}

class StylahViewModel(
    private val repo: StylahRepository = StylahRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(StylahUiState(user = repo.currentUser()))
    val uiState: StateFlow<StylahUiState> = _uiState.asStateFlow()

    init {
        refreshCatalog()
        repo.currentUser()?.let { refreshCustomerRecords(it.uid) }
    }

    fun refreshCatalog() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, errorMessage = null) }
            try {
                val settings = repo.fetchPublicSettings()
                val promos = repo.fetchPublishedPromotions()
                val prods = repo.fetchPublishedProducts()
                val svcs = repo.fetchPublishedServices()
                _uiState.update {
                    it.copy(
                        settings = settings,
                        promotions = promos,
                        products = prods,
                        services = svcs,
                        loading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, errorMessage = e.message) }
            }
        }
    }

    fun refreshCustomerRecords(uid: String) {
        viewModelScope.launch {
            try {
                val orders = repo.fetchCustomerOrders(uid)
                val bookings = repo.fetchCustomerBookings(uid)
                _uiState.update { it.copy(orders = orders, bookings = bookings) }
            } catch (_: Exception) {
            }
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, errorMessage = null) }
            try {
                val user = repo.signInWithEmail(email, password)
                _uiState.update { it.copy(user = user, loading = false) }
                refreshCustomerRecords(user.uid)
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, errorMessage = e.message) }
            }
        }
    }

    fun signInWithGoogle(activity: Activity) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, errorMessage = null) }
            try {
                val user = repo.signInWithGoogle(activity)
                _uiState.update { it.copy(user = user, loading = false) }
                refreshCustomerRecords(user.uid)
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, errorMessage = e.message) }
            }
        }
    }

    fun sendPasswordReset(email: String) {
        if (email.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Enter your email address to receive a password reset link.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, errorMessage = null) }
            try {
                repo.sendPasswordResetEmail(email)
                _uiState.update {
                    it.copy(
                        loading = false,
                        statusMessage = "Password reset link sent to ${email.trim()}."
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, errorMessage = e.message) }
            }
        }
    }

    fun register(fullName: String, email: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, errorMessage = null) }
            try {
                val user = repo.registerWithEmail(fullName, email, password)
                _uiState.update {
                    it.copy(
                        user = user,
                        loading = false,
                        statusMessage = "Account created. Please verify your email."
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, errorMessage = e.message) }
            }
        }
    }

    fun signOut() {
        repo.signOut()
        _uiState.update { it.copy(user = null, orders = emptyList(), bookings = emptyList()) }
    }

    fun addToCart(product: Product) {
        _uiState.update { state ->
            val existing = state.cart.indexOfFirst { it.productId == product.id }
            val updated = if (existing >= 0) {
                state.cart.toMutableList().apply {
                    val current = this[existing]
                    this[existing] = current.copy(quantity = current.quantity + 1)
                }
            } else {
                state.cart + CartItem(
                    productId = product.id,
                    productName = product.name,
                    variant = product.variations.firstOrNull() ?: "",
                    quantity = 1,
                    unitPriceKsh = product.activePriceKsh,
                    imageUrl = product.imageUrls.firstOrNull() ?: ""
                )
            }
            state.copy(cart = updated, statusMessage = "${product.name} added to cart")
        }
    }

    fun updateCartQuantity(productId: String, qty: Int) {
        _uiState.update { state ->
            val next = if (qty <= 0) {
                state.cart.filterNot { it.productId == productId }
            } else {
                state.cart.map { if (it.productId == productId) it.copy(quantity = qty) else it }
            }
            state.copy(cart = next)
        }
    }

    fun checkoutWithMpesa(
        name: String,
        phone: String,
        town: String,
        address: String,
        promoCode: String = ""
    ) {
        val user = _uiState.value.user ?: return
        val items = _uiState.value.cart
        if (items.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, errorMessage = null) }
            try {
                val msg = repo.createOrderAndInitiateMpesa(user, name, phone, town, address, items, promoCode)
                _uiState.update { it.copy(cart = emptyList(), loading = false, statusMessage = msg) }
                refreshCustomerRecords(user.uid)
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, errorMessage = e.message) }
            }
        }
    }

    fun submitBooking(
        name: String,
        phone: String,
        town: String,
        service: ServiceItem,
        desc: String,
        date: String,
        photoUri: Uri?
    ) {
        val user = _uiState.value.user ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, errorMessage = null) }
            try {
                val ref = repo.submitBookingWithPhoto(user, name, phone, town, service, desc, date, photoUri)
                _uiState.update { it.copy(loading = false, statusMessage = "Booking $ref submitted.") }
                refreshCustomerRecords(user.uid)
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, errorMessage = e.message) }
            }
        }
    }

    fun toggleTheme() {
        _uiState.update { it.copy(isDarkTheme = !it.isDarkTheme) }
    }

    fun clearBanner() {
        _uiState.update { it.copy(statusMessage = null, errorMessage = null) }
    }
}
