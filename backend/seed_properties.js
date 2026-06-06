/**
 * SEED PROPERTIES SCRIPT — Phase 1
 * Run from the backend/ directory with:
 *   node seed_properties.js
 *
 * This seeds 3 campsites and 2 villas into MongoDB.
 * It does NOT delete existing data — it only inserts if slugs don't exist.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./models/Property');

const seedProperties = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[ SUCCESS ] CONNECTED TO MONGODB');

        const sampleProperties = [
            // ---- CAMPSITES ----
            {
                name: 'Pawna Lakeside Camp',
                slug: 'pawna-lakeside-camp',
                type: 'campsite',
                shortDescription: 'Classic lakeside camping under the stars by the beautiful Pawna Lake.',
                description: 'Nestled along the pristine shores of Pawna Lake, this campsite offers an idyllic escape from city life. Wake up to misty lake views, stargazing nights, and the sounds of nature.',
                location: 'Pawna Lake, Lonavala',
                address: 'Pawna Lake Road, Near Bhor Ghat, Lonavala, Maharashtra 410401',
                coverImage: '/Pawna-Heart-Camp-01.webp',
                images: [
                    '/Pawna-Heart-Camp-01.webp',
                    '/Pawna-lake-camp-04.jpg',
                    '/IMG-20220611-WA0013.jpg',
                    '/fzpesczo08lpcgqo7bz1.jpg'
                ],
                amenities: ['Lakeside View', 'Campfire', 'BBQ Grill', 'Common Washroom', 'Stargazing Area', 'Bonfire'],
                pricing: {
                    basePrice: 1200,
                    priceDisplay: '₹1,200',
                    pricePer: 'person/night'
                },
                maxGuests: 50,
                checkInTime: '2:00 PM',
                checkOutTime: '11:00 AM',
                rules: ['No loud music after 10 PM', 'Keep the campsite clean', 'No open fire near tents'],
                whatsappNumber: '919975526627',
                isActive: true
            },
            {
                name: 'Heart Camp Pawna',
                slug: 'heart-camp-pawna',
                type: 'campsite',
                shortDescription: 'Our signature heart-shaped campsite layout with premium tent packages.',
                description: 'Experience the magic of Heart Camp — our most popular campsite featuring a unique heart-shaped layout visible from the hilltop. Enjoy premium camping with full meal service.',
                location: 'Pawna Lake, Lonavala',
                address: 'Heart Camp Road, Pawna Lake, Lonavala, Maharashtra 410401',
                coverImage: '/Pawna-lake-camping-camp-C-02-e1700593284643.webp',
                images: [
                    '/Pawna-lake-camping-camp-C-02-e1700593284643.webp',
                    '/Pawna-lake-camping-pawnacamp-72-768x512.jpg',
                    '/pawna-lake-luxury-camping-jpg.webp'
                ],
                amenities: ['Heart Layout', 'Lake View', 'Full Meals', 'Campfire', 'Photography Spot', 'Night Sky'],
                pricing: {
                    basePrice: 1800,
                    priceDisplay: '₹1,800',
                    pricePer: 'person/night'
                },
                maxGuests: 30,
                checkInTime: '2:00 PM',
                checkOutTime: '11:00 AM',
                rules: ['No pets allowed', 'Smoking only in designated areas'],
                whatsappNumber: '919975526627',
                isActive: true
            },
            {
                name: 'Luxury Glamping Escape',
                slug: 'luxury-glamping-escape',
                type: 'campsite',
                shortDescription: 'Premium glamping tents with all modern amenities and lake views.',
                description: 'For those who love nature but refuse to compromise on comfort. Our luxury glamping tents feature real beds, attached washrooms, and private decks overlooking Pawna Lake.',
                location: 'Pawna Lake, Lonavala',
                address: 'Luxury Camp Zone, Pawna Lake, Lonavala, Maharashtra 410401',
                coverImage: '/pawna-lake-luxury-camping-jpg.webp',
                images: [
                    '/pawna-lake-luxury-camping-jpg.webp',
                    '/luxury-cottage.webp',
                    '/cottage.jpg'
                ],
                amenities: ['Luxury Tent', 'Attached Washroom', 'Real Bed', 'Private Deck', 'Lake View', 'Room Service', 'Wi-Fi'],
                pricing: {
                    basePrice: 4000,
                    priceDisplay: '₹4,000',
                    pricePer: 'tent/night'
                },
                maxGuests: 15,
                checkInTime: '2:00 PM',
                checkOutTime: '11:00 AM',
                rules: ['No outside food allowed', 'Quiet hours after 10 PM'],
                whatsappNumber: '919975526627',
                isActive: true
            },

            // ---- VILLAS ----
            {
                name: 'Pawna View Villa',
                slug: 'pawna-view-villa',
                type: 'villa',
                shortDescription: 'A serene private villa with panoramic views of Pawna Lake and surrounding hills.',
                description: 'Pawna View Villa is a stunning private retreat perched on the hills overlooking Pawna Lake. Perfect for families and groups seeking privacy, comfort, and nature — all in one place.',
                location: 'Pawna Lake, Lonavala',
                address: 'Hillside Road, Pawna Lake, Lonavala, Maharashtra 410401',
                coverImage: '/cottage.jpg',
                images: [
                    '/cottage.jpg',
                    '/luxury-cottage.webp',
                    '/about.jpg'
                ],
                amenities: ['Private Pool', 'Lake View', 'Full Kitchen', '3 Bedrooms', 'Private Garden', 'Bonfire Pit', 'Parking', 'Wi-Fi'],
                pricing: {
                    basePrice: 12000,
                    priceDisplay: '₹12,000',
                    pricePer: 'villa/night'
                },
                maxGuests: 12,
                checkInTime: '2:00 PM',
                checkOutTime: '11:00 AM',
                rules: ['No parties or DJ events', 'No smoking indoors', 'Pets allowed with prior notice'],
                whatsappNumber: '919975526627',
                isActive: true
            },
            {
                name: 'The Hilltop Bungalow',
                slug: 'the-hilltop-bungalow',
                type: 'villa',
                shortDescription: 'A cozy hilltop bungalow perfect for couples and small groups seeking solitude.',
                description: 'Perched high on a quiet hilltop, The Hilltop Bungalow offers breathtaking sunrise and sunset views. With 2 bedrooms and a fully equipped kitchen, it\'s ideal for a peaceful long weekend getaway.',
                location: 'Mulshi, Pune',
                address: 'Hilltop Lane, Mulshi, Pune, Maharashtra 412108',
                coverImage: '/luxury-cottage.webp',
                images: [
                    '/luxury-cottage.webp',
                    '/cottage.jpg',
                    '/about.jpg'
                ],
                amenities: ['Hilltop Location', '2 Bedrooms', 'Full Kitchen', 'Valley View', 'Bonfire Pit', 'Hammock', 'Parking'],
                pricing: {
                    basePrice: 8000,
                    priceDisplay: '₹8,000',
                    pricePer: 'villa/night'
                },
                maxGuests: 6,
                checkInTime: '3:00 PM',
                checkOutTime: '11:00 AM',
                rules: ['No loud music', 'No outside alcohol', 'Caretaker on premises'],
                whatsappNumber: '919975526627',
                isActive: true
            }
        ];

        let inserted = 0;
        let skipped = 0;

        for (const propertyData of sampleProperties) {
            const existing = await Property.findOne({ slug: propertyData.slug });
            if (existing) {
                console.log(`[ SKIPPED ] "${propertyData.name}" already exists.`);
                skipped++;
            } else {
                await Property.create(propertyData);
                console.log(`[ CREATED ] "${propertyData.name}" (${propertyData.type})`);
                inserted++;
            }
        }

        console.log(`\n[ DONE ] ${inserted} properties created, ${skipped} skipped.`);
        process.exit(0);
    } catch (error) {
        console.error(`[ ERROR ] ${error.message}`);
        process.exit(1);
    }
};

seedProperties();
