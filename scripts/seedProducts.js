import mongoose from "mongoose";
import 'dotenv/config';
import Product from '../models/Products.js';

const mongoURI = process.env.MONGO_URI;

// Dummy products data in Indian Rupees (₹)
const products = [
  {
    product_name: 'Desi Ghee - 500ml',
    product_price: 450,
    product_image: 'https://picsum.photos/400/400?random=1',
    product_stock: 50,
    category: 'Dairy',
    description: 'Pure desi ghee made from fresh cream - 500ml',
    is_active: true,
  },
  {
    product_name: 'Paneer - 250g',
    product_price: 120,
    product_image: 'https://picsum.photos/400/400?random=2',
    product_stock: 30,
    category: 'Dairy',
    description: 'Fresh homemade paneer - 250g',
    is_active: true,
  },
  {
    product_name: 'Curd - 500g',
    product_price: 60,
    product_image: 'https://picsum.photos/400/400?random=3',
    product_stock: 40,
    category: 'Dairy',
    description: 'Fresh homemade curd - 500g',
    is_active: true,
  },
  {
    product_name: 'Butter - 200g',
    product_price: 180,
    product_image: 'https://picsum.photos/400/400?random=4',
    product_stock: 25,
    category: 'Dairy',
    description: 'Pure white butter - 200g',
    is_active: true,
  },
  {
    product_name: 'Lassi - 500ml',
    product_price: 40,
    product_image: 'https://picsum.photos/400/400?random=5',
    product_stock: 60,
    category: 'Beverages',
    description: 'Fresh sweet lassi - 500ml',
    is_active: true,
  },
  {
    product_name: 'Buttermilk - 1L',
    product_price: 35,
    product_image: 'https://picsum.photos/400/400?random=6',
    product_stock: 45,
    category: 'Beverages',
    description: 'Fresh buttermilk - 1L',
    is_active: true,
  },
  {
    product_name: 'Cream - 200ml',
    product_price: 80,
    product_image: 'https://picsum.photos/400/400?random=7',
    product_stock: 20,
    category: 'Dairy',
    description: 'Fresh cream - 200ml',
    is_active: true,
  },
  {
    product_name: 'Cheese - 200g',
    product_price: 150,
    product_image: 'https://picsum.photos/400/400?random=8',
    product_stock: 15,
    category: 'Dairy',
    description: 'Fresh homemade cheese - 200g',
    is_active: true,
  },
];

async function seedProducts() {
  try {
    if (!mongoURI) {
      console.error('❌ MONGO_URI is not set in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    let createdCount = 0;
    let updatedCount = 0;

    // Insert or update products
    for (const productData of products) {
      const existing = await Product.findOne({ 
        product_name: productData.product_name 
      });
      
      if (existing) {
        // Update existing product
        existing.product_price = productData.product_price;
        existing.product_image = productData.product_image;
        existing.product_stock = productData.product_stock;
        existing.category = productData.category;
        existing.description = productData.description;
        existing.is_active = productData.is_active;
        existing.updatedAt = new Date();
        await existing.save();
        console.log(`🔄 Updated product: ${productData.product_name} - ₹${productData.product_price}`);
        updatedCount++;
      } else {
        // Create new product
        await Product.create(productData);
        console.log(`✅ Created product: ${productData.product_name} - ₹${productData.product_price}`);
        createdCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${createdCount} products`);
    console.log(`   Updated: ${updatedCount} products`);
    console.log(`   Total: ${products.length} products`);
    console.log('\n✅ Products seeded successfully!');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedProducts();

