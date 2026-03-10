require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./models/Package');

const seedPackages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        await Package.deleteMany(); // Clear existing

        const packages = [
            {
                title: 'Normal Tent',
                description: 'A classic lakeside camping experience under the stars. Perfect for adventure seekers.',
                features: ['Lakeside View', 'Common Washroom', 'BBQ Grill', 'Campfire'],
                price: '₹1,200',
                priceValue: 1200,
                maxCapacity: 0, // unlimited
                image: '/normal-tent.jpg'
            },
            {
                title: 'Cozy Cottage',
                description: 'Comfortable private cottages blending rustic charm with modern amenities.',
                features: ['Private Washroom', 'Comfortable Bed', 'Fan & Lights', 'Lake View Balcony'],
                price: '₹2,500',
                priceValue: 2500,
                maxCapacity: 5,
                image: '/cottage.jpg'
            },
            {
                title: 'Luxury Cottage',
                description: 'The ultimate glamping experience. Indulge in premium comfort surrounded by nature.',
                features: ['AC Room', 'Luxurious Bath', 'Private Deck', 'Room Service'],
                price: '₹4,000',
                priceValue: 4000,
                maxCapacity: 3,
                image: '/luxury-cottage.webp'
            }
        ];

        await Package.insertMany(packages);
        console.log("Packages seeded successfully!");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

seedPackages();
