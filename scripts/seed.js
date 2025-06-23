require('dotenv').config();
const db = require('../config/database');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - be careful in production!)
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    await db.execute('TRUNCATE TABLE messages');
    await db.execute('TRUNCATE TABLE traveler_connections');
    await db.execute('TRUNCATE TABLE reviews');
    await db.execute('TRUNCATE TABLE accommodations');
    await db.execute('TRUNCATE TABLE users');
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️  Cleared existing data');

    // Sample users
    const password_hash = await bcrypt.hash('password123', 12);
    
    const users = [
      {
        email: 'sweta.rajan@email.com',
        full_name: 'Sweta Rajan',
        gender: 'female',
        age: 26,
        interests: JSON.stringify(['hiking', 'photography', 'local cuisine'])
      },
      {
        email: 'arjun.sharma@email.com',
        full_name: 'Arjun Sharma',
        gender: 'male',
        age: 25,
        interests: JSON.stringify(['co-working', 'tech meetups', 'adventure sports'])
      },
      {
        email: 'priya.singh@email.com',
        full_name: 'Priya Singh',
        gender: 'female',
        age: 28,
        interests: JSON.stringify(['yoga', 'art galleries', 'sustainable travel'])
      }
    ];

    for (const user of users) {
      await db.execute(`
        INSERT INTO users (email, password_hash, full_name, gender, age, interests)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [user.email, password_hash, user.full_name, user.gender, user.age, user.interests]);
    }
    console.log('✅ Sample users created');

    // Sample accommodations
    const accommodations = [
      {
        name: 'Cozy Central Hostel',
        description: 'A safe and clean hostel in the heart of the city with 24/7 security and female-only dorms available.',
        city: 'Bangalore',
        address: 'MG Road, Bangalore, Karnataka 560001',
        latitude: 12.9716,
        longitude: 77.5946,
        price_per_night: 2500,
        accommodation_type: 'hostel',
        amenities: JSON.stringify(['Free WiFi', '24/7 Security', 'Female Dorm', 'Kitchen', 'Common Area', 'Laundry']),
        photos: JSON.stringify(['hostel1.jpg', 'hostel2.jpg', 'hostel3.jpg']),
        contact_info: JSON.stringify({phone: '+91-80-12345678', email: 'info@cozyhostel.com'})
      },
      {
        name: 'Backpacker\'s Paradise',
        description: 'Budget-friendly hostel with great social atmosphere and co-working space.',
        city: 'Pune',
        address: 'Koregaon Park, Pune, Maharashtra 411001',
        latitude: 18.5204,
        longitude: 73.8567,
        price_per_night: 1800,
        accommodation_type: 'hostel',
        amenities: JSON.stringify(['WiFi', 'Common Area', 'Laundry', 'Cafe', 'Bike Rental', 'Co-working Space']),
        photos: JSON.stringify(['hostel4.jpg', 'hostel5.jpg']),
        contact_info: JSON.stringify({phone: '+91-20-87654321', email: 'hello@backpackersparadise.com'})
      },
      {
        name: 'Urban Nomad Hub',
        description: 'Modern co-living space for digital nomads with high-speed internet and rooftop workspace.',
        city: 'Mumbai',
        address: 'Bandra West, Mumbai, Maharashtra 400050',
        latitude: 19.0760,
        longitude: 72.8777,
        price_per_night: 3200,
        accommodation_type: 'hostel',
        amenities: JSON.stringify(['Co-working Space', 'AC', '24/7 Security', 'Rooftop', 'High-speed WiFi', 'Gym']),
        photos: JSON.stringify(['nomad1.jpg', 'nomad2.jpg', 'nomad3.jpg']),
        contact_info: JSON.stringify({phone: '+91-22-11223344', email: 'stay@urbannomad.com'})
      },
      {
        name: 'Heritage Homestay',
        description: 'Traditional homestay with local family, perfect for cultural immersion.',
        city: 'Delhi',
        address: 'Karol Bagh, New Delhi, Delhi 110005',
        latitude: 28.6139,
        longitude: 77.2090,
        price_per_night: 2200,
        accommodation_type: 'homestay',
        amenities: JSON.stringify(['Home-cooked Meals', 'Cultural Tours', 'WiFi', 'AC', 'Local Guide']),
        photos: JSON.stringify(['heritage1.jpg', 'heritage2.jpg']),
        contact_info: JSON.stringify({phone: '+91-11-99887766', email: 'family@heritagehomestay.com'})
      }
    ];

    const accommodationIds = [];
    for (const acc of accommodations) {
      const [result] = await db.execute(`
        INSERT INTO accommodations 
        (name, description, city, address, latitude, longitude, price_per_night, accommodation_type, amenities, photos, contact_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        acc.name, acc.description, acc.city, acc.address, 
        acc.latitude, acc.longitude, acc.price_per_night, 
        acc.accommodation_type, acc.amenities, acc.photos, acc.contact_info
      ]);
      accommodationIds.push(result.insertId);
    }
    console.log('✅ Sample accommodations created');

    // Sample reviews (especially female reviews for safety ratings)
    const reviews = [
      {
        user_id: 1, // Sweta
        accommodation_id: accommodationIds[0],
        rating: 5,
        safety_rating: 5,
        review_text: 'Excellent hostel! Felt very safe as a solo female traveler. Staff was helpful and the female dorm was clean and secure.',
        is_female_review: true
      },
      {
        user_id: 3, // Priya
        accommodation_id: accommodationIds[0],
        rating: 4,
        safety_rating: 5,
        review_text: 'Great location and very safe. 24/7 security made me feel comfortable staying here alone.',
        is_female_review: true
      },
      {
        user_id: 2, // Arjun
        accommodation_id: accommodationIds[1],
        rating: 4,
        safety_rating: 4,
        review_text: 'Good co-working space and fast WiFi. Met some interesting fellow travelers here.',
        is_female_review: false
      },
      {
        user_id: 1, // Sweta
        accommodation_id: accommodationIds[2],
        rating: 5,
        safety_rating: 4,
        review_text: 'Premium location in Bandra. Slightly expensive but worth it for the amenities and safety.',
        is_female_review: true
      }
    ];

    for (const review of reviews) {
      await db.execute(`
        INSERT INTO reviews (user_id, accommodation_id, rating, safety_rating, review_text, is_female_review)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [review.user_id, review.accommodation_id, review.rating, review.safety_rating, review.review_text, review.is_female_review]);
    }
    console.log('✅ Sample reviews created');

    // Sample traveler connections
    const connections = [
      {
        user_id: 1,
        accommodation_id: accommodationIds[0],
        travel_dates: JSON.stringify({checkin: '2025-07-01', checkout: '2025-07-03'}),
        message: 'Looking for someone to explore Bangalore with! Love photography and local food.'
      },
      {
        user_id: 2,
        accommodation_id: accommodationIds[1],
        travel_dates: JSON.stringify({checkin: '2025-07-05', checkout: '2025-07-07'}),
        message: 'Working remotely from Pune. Would love to meet fellow developers or entrepreneurs.'
      },
      {
        user_id: 3,
        accommodation_id: accommodationIds[2],
        travel_dates: JSON.stringify({checkin: '2025-07-10', checkout: '2025-07-12'}),
        message: 'First time in Mumbai! Looking for travel buddies to explore the city safely.'
      }
    ];

    for (const connection of connections) {
      await db.execute(`
        INSERT INTO traveler_connections (user_id, accommodation_id, travel_dates, message)
        VALUES (?, ?, ?, ?)
      `, [connection.user_id, connection.accommodation_id, connection.travel_dates, connection.message]);
    }
    console.log('✅ Sample traveler connections created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Sample data includes:');
    console.log('   👥 3 users (including female travelers)');
    console.log('   🏠 4 accommodations across different cities');
    console.log('   ⭐ 4 reviews (including female safety reviews)');
    console.log('   🤝 3 traveler connections');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

// Run seeding
seedData();
