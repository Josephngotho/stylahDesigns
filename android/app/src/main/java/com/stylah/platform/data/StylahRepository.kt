package com.stylah.platform.data

import android.app.Activity
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.OAuthProvider
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import com.stylah.platform.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class StylahRepository {
    val auth: FirebaseAuth = FirebaseAuth.getInstance()
    val db: FirebaseFirestore = FirebaseFirestore.getInstance(BuildConfig.FIRESTORE_DATABASE_ID)
    private val storage: FirebaseStorage = FirebaseStorage.getInstance()
    private val httpClient = OkHttpClient()

    fun currentUser(): FirebaseUser? = auth.currentUser

    suspend fun signInWithEmail(email: String, password: String): FirebaseUser {
        val result = auth.signInWithEmailAndPassword(email.trim(), password).await()
        return result.user ?: throw IllegalStateException("Authentication failed.")
    }

    suspend fun signInWithGoogle(activity: Activity): FirebaseUser {
        val provider = OAuthProvider.newBuilder("google.com")
            .setScopes(listOf("email", "profile"))
            .build()
        val pending = auth.pendingAuthResult
        val result = if (pending != null) {
            pending.await()
        } else {
            auth.startActivityForSignInWithProvider(activity, provider).await()
        }
        val user = result.user ?: throw IllegalStateException("Google Sign-In failed.")
        ensureUserDocument(user)
        return user
    }

    suspend fun sendPasswordResetEmail(email: String) {
        auth.sendPasswordResetEmail(email.trim()).await()
    }

    suspend fun registerWithEmail(fullName: String, email: String, password: String): FirebaseUser {
        val result = auth.createUserWithEmailAndPassword(email.trim(), password).await()
        val user = result.user ?: throw IllegalStateException("Registration failed.")
        user.sendEmailVerification().await()
        ensureUserDocument(user, fullName.trim())
        return user
    }

    private suspend fun ensureUserDocument(user: FirebaseUser, preferredName: String? = null) {
        val docRef = db.collection("users").document(user.uid)
        val snap = docRef.get().await()
        if (!snap.exists()) {
            docRef.set(
                mapOf(
                    "uid" to user.uid,
                    "fullName" to (preferredName?.takeIf { it.isNotBlank() } ?: user.displayName ?: "Customer"),
                    "profileImage" to (user.photoUrl?.toString() ?: ""),
                    "role" to "customer",
                    "accountStatus" to "active",
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        }
    }

    fun signOut() = auth.signOut()

    suspend fun fetchPublicSettings(): PublicSettings {
        return try {
            val snap = db.collection("settings").document("public").get().await()
            if (!snap.exists()) return PublicSettings()
            PublicSettings(
                businessName = snap.getString("businessName")?.takeIf { it.isNotBlank() }
                    ?: BrandDefaults.BRAND_NAME,
                tagline = snap.getString("tagline")?.takeIf { it.isNotBlank() }
                    ?: BrandDefaults.BRAND_TAGLINE,
                logoUrl = snap.getString("logoUrl") ?: "",
                announcementText = snap.getString("announcementText") ?: "",
                announcementActive = snap.getBoolean("announcementActive") ?: false,
                heroKicker = snap.getString("heroKicker")?.takeIf { it.isNotBlank() }
                    ?: "${BrandDefaults.BRAND_NAME} · Kenya",
                heroHeadline = snap.getString("heroHeadline")?.takeIf { it.isNotBlank() }
                    ?: "Architectural Wallpapers, Chandeliers & Smart Security",
                heroSubtitle = snap.getString("heroSubtitle")?.takeIf { it.isNotBlank() }
                    ?: PublicSettings().heroSubtitle,
                heroImageUrl = snap.getString("heroImageUrl") ?: "",
                heroPrimaryCta = snap.getString("heroPrimaryCta")?.takeIf { it.isNotBlank() }
                    ?: "Shop Products",
                heroSecondaryCta = snap.getString("heroSecondaryCta")?.takeIf { it.isNotBlank() }
                    ?: "Book Installation",
                whatsappNumber = snap.getString("whatsappNumber")?.takeIf { it.isNotBlank() }
                    ?: BrandDefaults.DEFAULT_WHATSAPP_NUMBER,
                supportEmail = snap.getString("supportEmail")?.takeIf { it.isNotBlank() }
                    ?: BrandDefaults.DEFAULT_SUPPORT_EMAIL,
                showroomLocation = snap.getString("showroomLocation") ?: "",
                facebookUrl = snap.getString("facebookUrl") ?: "",
                instagramUrl = snap.getString("instagramUrl") ?: "",
                tiktokUrl = snap.getString("tiktokUrl") ?: "",
                standardDeliveryFeeKsh = snap.getDouble("standardDeliveryFeeKsh") ?: 650.0,
                freeDeliveryThresholdKsh = snap.getDouble("freeDeliveryThresholdKsh") ?: 25000.0
            )
        } catch (_: Exception) {
            PublicSettings()
        }
    }

    suspend fun fetchPublishedPromotions(): List<Promotion> {
        return try {
            val snap = db.collection("promotions").whereEqualTo("published", true).get().await()
            snap.documents.mapNotNull { it.toObject(Promotion::class.java)?.copy(id = it.id) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun fetchPublishedProducts(): List<Product> {
        val snap = db.collection("products").whereEqualTo("published", true).get().await()
        return snap.documents.mapNotNull { it.toObject(Product::class.java)?.copy(id = it.id) }
    }

    suspend fun fetchPublishedServices(): List<ServiceItem> {
        val snap = db.collection("services").whereEqualTo("published", true).get().await()
        return snap.documents.mapNotNull { it.toObject(ServiceItem::class.java)?.copy(id = it.id) }
    }

    suspend fun fetchCustomerOrders(uid: String): List<OrderSummary> {
        val snap = db.collection("orders").whereEqualTo("customerId", uid).get().await()
        return snap.documents.map { doc ->
            OrderSummary(
                id = doc.id,
                orderRef = doc.getString("orderRef") ?: doc.id,
                itemsSummary = doc.getString("itemsSummary") ?: "",
                totalKsh = doc.getDouble("totalKsh") ?: 0.0,
                paymentStatus = doc.getString("paymentStatus") ?: "unpaid",
                orderStatus = doc.getString("orderStatus") ?: "pending"
            )
        }
    }

    suspend fun fetchCustomerBookings(uid: String): List<BookingSummary> {
        val snap = db.collection("bookings").whereEqualTo("customerId", uid).get().await()
        return snap.documents.map { doc ->
            BookingSummary(
                id = doc.id,
                bookingRef = doc.getString("bookingRef") ?: doc.id,
                serviceTitle = doc.getString("serviceTitle") ?: "",
                locationTown = doc.getString("locationTown") ?: "",
                preferredDate = doc.getString("preferredDate") ?: "",
                status = doc.getString("status") ?: "pending"
            )
        }
    }

    suspend fun submitBookingWithPhoto(
        user: FirebaseUser,
        customerName: String,
        phoneNumber: String,
        town: String,
        service: ServiceItem,
        description: String,
        preferredDate: String,
        photoUri: Uri?
    ): String {
        val bookingId = "bk_${System.currentTimeMillis()}"
        val bookingRef = "BK-${System.currentTimeMillis().toString().takeLast(6)}"
        val uploadedUrls = mutableListOf<String>()

        if (photoUri != null) {
            val storageRef = storage.reference.child("bookings/${user.uid}/$bookingId/${System.currentTimeMillis()}.jpg")
            storageRef.putFile(photoUri).await()
            uploadedUrls.add(storageRef.downloadUrl.await().toString())
        }

        db.collection("bookings").document(bookingId).set(
            mapOf(
                "bookingRef" to bookingRef,
                "customerId" to user.uid,
                "customerName" to customerName.trim(),
                "phoneNumber" to phoneNumber.trim(),
                "email" to (user.email ?: ""),
                "locationTown" to town.trim(),
                "serviceId" to service.id,
                "serviceTitle" to service.title,
                "projectDescription" to description.trim(),
                "preferredDate" to preferredDate,
                "attachmentUrls" to uploadedUrls,
                "status" to "pending",
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()

        return bookingRef
    }

    suspend fun createOrderAndInitiateMpesa(
        user: FirebaseUser,
        customerName: String,
        phone: String,
        town: String,
        address: String,
        cartItems: List<CartItem>,
        promoCode: String = ""
    ): String = withContext(Dispatchers.IO) {
        val token = user.getIdToken(false).await().token
            ?: throw IllegalStateException("Missing Firebase ID token.")

        val itemsArray = JSONArray().apply {
            cartItems.forEach {
                put(JSONObject().apply {
                    put("productId", it.productId)
                    put("quantity", it.quantity)
                })
            }
        }
        val validatePayload = JSONObject().apply {
            put("items", itemsArray)
            put("deliveryTown", town)
            if (promoCode.isNotBlank()) {
                put("promoCode", promoCode.trim().uppercase())
            }
        }

        val validateReq = Request.Builder()
            .url("${BuildConfig.API_BASE_URL}/api/orders/validate")
            .addHeader("Authorization", "Bearer $token")
            .post(validatePayload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        val validateRes = httpClient.newCall(validateReq).execute()
        val validateBody = JSONObject(validateRes.body?.string() ?: "{}")
        if (!validateRes.isSuccessful || !validateBody.optBoolean("verified", false)) {
            throw IllegalStateException(validateBody.optString("error", "Order validation failed."))
        }

        val totalKsh = validateBody.getDouble("totalKsh")
        val subtotalKsh = validateBody.getDouble("subtotalKsh")
        val deliveryFeeKsh = validateBody.getDouble("deliveryFeeKsh")
        val discountKsh = validateBody.optDouble("discountKsh", 0.0)
        val orderId = "ord_${System.currentTimeMillis()}"
        val orderRef = "STY-${System.currentTimeMillis().toString().takeLast(6)}"

        db.collection("orders").document(orderId).set(
            mapOf(
                "orderRef" to orderRef,
                "customerId" to user.uid,
                "customerName" to customerName.trim(),
                "customerPhone" to phone.trim(),
                "customerEmail" to (user.email ?: ""),
                "deliveryTown" to town.trim(),
                "deliveryAddress" to address.trim(),
                "itemsSummary" to "${cartItems.first().productName}${if (cartItems.size > 1) " + ${cartItems.size - 1} more" else ""}",
                "itemCount" to cartItems.sumOf { it.quantity },
                "subtotalKsh" to subtotalKsh,
                "deliveryFeeKsh" to deliveryFeeKsh,
                "discountKsh" to discountKsh,
                "totalKsh" to totalKsh,
                "paymentMethod" to "mpesa_stk",
                "paymentStatus" to "pending",
                "orderStatus" to "awaiting_payment",
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()

        val stkPayload = JSONObject().apply {
            put("orderId", orderId)
            put("orderRef", orderRef)
            put("phoneNumber", phone)
            put("amountKsh", totalKsh)
        }
        val stkReq = Request.Builder()
            .url("${BuildConfig.API_BASE_URL}/api/mpesa/stkpush")
            .addHeader("Authorization", "Bearer $token")
            .post(stkPayload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        val stkRes = httpClient.newCall(stkReq).execute()
        val stkJson = JSONObject(stkRes.body?.string() ?: "{}")
        if (stkRes.isSuccessful) {
            "$orderRef: ${stkJson.optString("customerMessage", "M-Pesa STK Push sent.")}"
        } else {
            "$orderRef saved (awaiting payment): ${stkJson.optString("message", stkJson.optString("error", "Check M-Pesa configuration"))}"
        }
    }
}
