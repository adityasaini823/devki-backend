import mongoose from "mongoose";
import 'dotenv/config';
import SubscriptionProduct from '../models/SubscriptionProducts.js';

const mongoURI = process.env.MONGO_URI;

// Subscription products data in Indian Rupees (₹)
const subscriptionProducts = [
  {
    quantity: '1L',
    name: '1 Liter Fresh Milk',
    price_per_unit: 50,           // ₹50 per liter
    price_per_delivery: 50,        // ₹50 for 1L delivery
    image: '',
    description: 'Fresh 1 liter milk delivery - Pure and nutritious',
    is_active: true,
  },
  {
    quantity: '2L',
    name: '2 Liter Fresh Milk',
    price_per_unit: 45,            // ₹45 per liter (bulk discount)
    price_per_delivery: 90,        // ₹90 for 2L delivery
    image: '',
    description: 'Fresh 2 liter milk delivery - Best value for families',
    is_active: true,
  },
  {
    quantity: '3L',
    name: '3 Liter Fresh Milk',
    price_per_unit: 43,            // ₹43 per liter (bulk discount)
    price_per_delivery: 129,       // ₹129 for 3L delivery
    image: '',
    description: 'Fresh 3 liter milk delivery - Perfect for large families',
    is_active: true,
  },
  {
    quantity: '5L',
    name: '5 Liter Fresh Milk',
    price_per_unit: 40,            // ₹40 per liter (maximum bulk discount)
    price_per_delivery: 200,        // ₹200 for 5L delivery
    image: '',
    description: 'Fresh 5 liter milk delivery - Maximum savings for bulk buyers',
    is_active: true,
  },
];

async function seedSubscriptionProducts() {
  try {
    if (!mongoURI) {
      console.error('❌ MONGO_URI is not set in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    let createdCount = 0;
    let skippedCount = 0;

    // Insert or update products
    for (const productData of subscriptionProducts) {
      const existing = await SubscriptionProduct.findOne({ quantity: productData.quantity });
      
      if (existing) {
        // Update existing product
        existing.name = productData.name;
        existing.price_per_unit = productData.price_per_unit;
        existing.price_per_delivery = productData.price_per_delivery;
        existing.image = productData.image;
        existing.description = productData.description;
        existing.is_active = productData.is_active;
        existing.updatedAt = new Date();
        await existing.save();
        console.log(`🔄 Updated subscription product: ${productData.quantity} - ₹${productData.price_per_delivery}`);
        skippedCount++;
      } else {
        // Create new product
        await SubscriptionProduct.create(productData);
        console.log(`✅ Created subscription product: ${productData.quantity} - ₹${productData.price_per_delivery}`);
        createdCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${createdCount} products`);
    console.log(`   Updated: ${skippedCount} products`);
    console.log(`   Total: ${subscriptionProducts.length} products`);
    console.log('\n✅ Subscription products seeded successfully!');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding subscription products:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedSubscriptionProducts();

