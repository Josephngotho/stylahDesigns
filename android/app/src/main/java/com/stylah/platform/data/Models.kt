package com.stylah.platform.data

object BrandDefaults {
    const val BRAND_NAME = "Stylah Designs & Interiors"
    const val BRAND_TAGLINE = "Transforming Walls, Elevating Spaces."
    const val DEFAULT_WHATSAPP_NUMBER = "254745280011"
    const val DEFAULT_SUPPORT_EMAIL = "stylahindustries297@gmail.com"
}

data class Product(
    val id: String = "",
    val name: String = "",
    val slug: String = "",
    val description: String = "",
    val categoryId: String = "",
    val categoryName: String = "",
    val priceKsh: Double = 0.0,
    val discountedPriceKsh: Double? = null,
    val stockQty: Int = 0,
    val availabilityStatus: String = "in_stock",
    val featured: Boolean = false,
    val published: Boolean = true,
    val imageUrls: List<String> = emptyList(),
    val variations: List<String> = emptyList()
) {
    val activePriceKsh: Double
        get() = if (discountedPriceKsh != null && discountedPriceKsh > 0 && discountedPriceKsh < priceKsh) {
            discountedPriceKsh
        } else {
            priceKsh
        }
}

data class ServiceItem(
    val id: String = "",
    val title: String = "",
    val slug: String = "",
    val description: String = "",
    val category: String = "",
    val estimatedPriceKsh: Double = 0.0,
    val priceUnit: String = "",
    val available: Boolean = true,
    val published: Boolean = true,
    val imageUrls: List<String> = emptyList()
)

data class Promotion(
    val id: String = "",
    val code: String = "",
    val title: String = "",
    val discountPercent: Double = 0.0,
    val published: Boolean = true
)

data class PublicSettings(
    val businessName: String = BrandDefaults.BRAND_NAME,
    val tagline: String = BrandDefaults.BRAND_TAGLINE,
    val logoUrl: String = "",
    val announcementText: String = "",
    val announcementActive: Boolean = false,
    val heroKicker: String = "${BrandDefaults.BRAND_NAME} · Kenya",
    val heroHeadline: String = "Architectural Wallpapers, Chandeliers & Smart Security",
    val heroSubtitle: String =
        "Transforming Walls, Elevating Spaces. Curated wall murals, luxury interior lighting, and 4K CCTV surveillance supplied across Kenya.",
    val heroImageUrl: String = "",
    val heroPrimaryCta: String = "Shop Products",
    val heroSecondaryCta: String = "Book Installation",
    val whatsappNumber: String = BrandDefaults.DEFAULT_WHATSAPP_NUMBER,
    val supportEmail: String = BrandDefaults.DEFAULT_SUPPORT_EMAIL,
    val showroomLocation: String = "",
    val facebookUrl: String = "",
    val instagramUrl: String = "",
    val tiktokUrl: String = "",
    val standardDeliveryFeeKsh: Double = 650.0,
    val freeDeliveryThresholdKsh: Double = 25000.0
)

data class CartItem(
    val productId: String = "",
    val productName: String = "",
    val variant: String = "",
    val quantity: Int = 1,
    val unitPriceKsh: Double = 0.0,
    val imageUrl: String = ""
)

data class OrderSummary(
    val id: String = "",
    val orderRef: String = "",
    val itemsSummary: String = "",
    val totalKsh: Double = 0.0,
    val paymentStatus: String = "unpaid",
    val orderStatus: String = "pending"
)

data class BookingSummary(
    val id: String = "",
    val bookingRef: String = "",
    val serviceTitle: String = "",
    val locationTown: String = "",
    val preferredDate: String = "",
    val status: String = "pending"
)

fun formatKsh(amount: Double): String = "KSh ${"%,.0f".format(amount)}"
