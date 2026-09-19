// tests/m2_challenger_verification.mjs
// Empirical Challenger M2-2 Automated Verification Suite
// Verifies Features 15, 16, 17, 18, 19, and Production Build Integrity

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');

console.log('================================================================');
console.log('   CHALLENGER M2-2: EMPIRICAL VERIFICATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
    totalTests++;
    try {
        console.log(`[TEST ${totalTests}] ${testName}`);
        testFn();
        console.log(`       -> PASS\n`);
        passedTests++;
    } catch (err) {
        console.error(`       -> FAIL: ${err.message}\n`);
        throw err;
    }
}

// ----------------------------------------------------------------------
// 1. Production Build Integrity
// ----------------------------------------------------------------------
runTest('Production build executes cleanly with exit code 0', () => {
    const buildOutput = execSync('npm.cmd run build', {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'pipe'
    });
    assert(buildOutput.includes('built in') || buildOutput.includes('dist/index.html'),
        'Build output should confirm successful bundling');
    
    // Verify dist artifacts exist
    assert(fs.existsSync(path.join(ROOT_DIR, 'dist', 'index.html')), 'dist/index.html must exist');
    assert(fs.existsSync(path.join(ROOT_DIR, 'dist', 'sw.js')), 'dist/sw.js PWA worker must exist');
    console.log('       Asserted: npm run build exited 0, dist/index.html and dist/sw.js generated');
});

// ----------------------------------------------------------------------
// 2. Feature 15: Hero Video Poster & Preload
// ----------------------------------------------------------------------
runTest('Feature 15: Hero.jsx video element has poster="/Pawna-Heart-Camp-01.webp"', () => {
    const heroPath = path.join(ROOT_DIR, 'src', 'components', 'Hero.jsx');
    assert(fs.existsSync(heroPath), 'src/components/Hero.jsx must exist');
    const heroCode = fs.readFileSync(heroPath, 'utf-8');

    // Assert poster attribute on video
    const posterRegex = /poster=["']\/Pawna-Heart-Camp-01\.webp["']/;
    assert(posterRegex.test(heroCode), 'Hero.jsx must have poster="/Pawna-Heart-Camp-01.webp"');
    
    // Assert fetchPriority on video
    assert(heroCode.includes('fetchPriority="high"'), 'Hero.jsx video should specify high fetchPriority');
    console.log('       Asserted: poster="/Pawna-Heart-Camp-01.webp" present in Hero.jsx');
});

runTest('Feature 15: index.html has high-priority preload link for poster image', () => {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    assert(fs.existsSync(indexPath), 'index.html must exist');
    const indexCode = fs.readFileSync(indexPath, 'utf-8');

    const preloadRegex = /<link\s+rel=["']preload["']\s+as=["']image["']\s+href=["']\/Pawna-Heart-Camp-01\.webp["']/i;
    assert(preloadRegex.test(indexCode), 'index.html must have <link rel="preload" as="image" href="/Pawna-Heart-Camp-01.webp"');
    assert(indexCode.includes('fetchpriority="high"'), 'index.html preload link must have fetchpriority="high"');

    // Assert asset exists in public folder
    const assetPath = path.join(ROOT_DIR, 'public', 'Pawna-Heart-Camp-01.webp');
    assert(fs.existsSync(assetPath), 'public/Pawna-Heart-Camp-01.webp file must exist on disk');
    const stat = fs.statSync(assetPath);
    assert(stat.size > 1000, `Poster file size must be non-trivial (got ${stat.size} bytes)`);
    console.log(`       Asserted: preload link in index.html and public asset exists (${stat.size} bytes)`);
});

// ----------------------------------------------------------------------
// 3. Feature 16: Mobile Collision Elimination
// ----------------------------------------------------------------------
runTest('Feature 16: WhatsAppButton uses z-40 and dynamic bottom spacing on detail pages', () => {
    const waPath = path.join(ROOT_DIR, 'src', 'components', 'WhatsAppButton.jsx');
    assert(fs.existsSync(waPath), 'src/components/WhatsAppButton.jsx must exist');
    const waCode = fs.readFileSync(waPath, 'utf-8');

    // Assert z-40
    assert(waCode.includes('z-40'), 'WhatsAppButton must use z-40');
    // Ensure old z-[9999] was removed
    assert(!waCode.includes('z-[9999]'), 'WhatsAppButton must NOT use z-[9999]');

    // Assert route detection for campsite and villa
    assert(waCode.includes("location.pathname.startsWith('/campsite/')"), 'WhatsAppButton must detect /campsite/ path');
    assert(waCode.includes("location.pathname.startsWith('/villa/')"), 'WhatsAppButton must detect /villa/ path');

    // Assert dynamic safe-area elevation calculation
    assert(waCode.includes('bottom-[calc(5.25rem+max(12px,env(safe-area-inset-bottom)))]'), 
        'WhatsAppButton must use dynamic calc spacing for mobile bottom bar');
    assert(waCode.includes('lg:bottom-6'), 'WhatsAppButton must reset to lg:bottom-6 on desktop');
    console.log('       Asserted: WhatsAppButton uses z-40, route detection, and dynamic calc spacing');
});

runTest('Feature 16: VillaDetail uses z-30 for fixed bottom bar and pb-28 bottom container padding', () => {
    const villaPath = path.join(ROOT_DIR, 'src', 'pages', 'VillaDetail.jsx');
    assert(fs.existsSync(villaPath), 'src/pages/VillaDetail.jsx must exist');
    const villaCode = fs.readFileSync(villaPath, 'utf-8');

    // Assert z-30 on fixed bottom booking bar
    const barRegex = /<div\s+className=["'][^"']*lg:hidden\s+fixed\s+bottom-0[^"']*z-30[^"']*["']/;
    assert(barRegex.test(villaCode), 'VillaDetail sticky mobile bar must use z-30');

    // Assert pb-28 container padding
    assert(villaCode.includes('pb-28 lg:pb-0'), 'VillaDetail container must have pb-28 lg:pb-0 to avoid collision');
    console.log('       Asserted: VillaDetail uses z-30 on mobile bar and pb-28 lg:pb-0 on outer container');
});

// ----------------------------------------------------------------------
// 4. Feature 17: Detail Action Clarity (CTA Labels)
// ----------------------------------------------------------------------
runTest('Feature 17: CampsiteDetail CTA button is "Book Package" with reassurance microcopy', () => {
    const campPath = path.join(ROOT_DIR, 'src', 'pages', 'CampsiteDetail.jsx');
    assert(fs.existsSync(campPath), 'src/pages/CampsiteDetail.jsx must exist');
    const campCode = fs.readFileSync(campPath, 'utf-8');

    // Assert "Book Package" button text
    assert(campCode.includes('Book Package'), 'CampsiteDetail must have "Book Package" button label');
    // Assert old ambiguous "Contact Owner" was removed
    assert(!campCode.includes('Contact Owner'), 'Ambiguous "Contact Owner" must not be used on package CTA');

    // Assert microcopy
    assert(campCode.includes('Reserve online with zero upfront payment • Instant WhatsApp confirmation'),
        'CampsiteDetail must contain reassurance microcopy');
    console.log('       Asserted: CampsiteDetail CTA is "Book Package" with zero upfront microcopy');
});

runTest('Feature 17: VillaDetail CTA button is "Reserve Villa" in both desktop and mobile bars', () => {
    const villaPath = path.join(ROOT_DIR, 'src', 'pages', 'VillaDetail.jsx');
    const villaCode = fs.readFileSync(villaPath, 'utf-8');

    // Count occurrences of "Reserve Villa"
    const matches = villaCode.match(/Reserve Villa/g);
    assert(matches && matches.length >= 2, 'VillaDetail must have "Reserve Villa" in desktop panel and mobile bar');

    // Assert old ambiguous "Contact Owner" was removed
    assert(!villaCode.includes('Contact Owner'), 'Ambiguous "Contact Owner" must not be used on villa CTA');

    // Assert microcopy
    assert(villaCode.includes('Reserve online with zero upfront payment • Instant WhatsApp confirmation'),
        'VillaDetail must contain reassurance microcopy');
    console.log(`       Asserted: VillaDetail has ${matches.length} "Reserve Villa" CTA occurrences`);
});

// ----------------------------------------------------------------------
// 5. Feature 18: Post-Booking Completion View in Booking.jsx
// ----------------------------------------------------------------------
runTest('Feature 18: Booking.jsx generates and formats #PC-XXXXXX reference code', () => {
    const bookingPath = path.join(ROOT_DIR, 'src', 'components', 'Booking.jsx');
    assert(fs.existsSync(bookingPath), 'src/components/Booking.jsx must exist');
    const bookingCode = fs.readFileSync(bookingPath, 'utf-8');

    // Assert ref code formatting logic: #PC-${(savedBooking._id || '').slice(-6).toUpperCase()}
    assert(bookingCode.includes('#PC-'), 'Booking.jsx must format reference with #PC- prefix');
    assert(bookingCode.includes('.slice(-6).toUpperCase()'), 'Booking.jsx must take last 6 chars uppercase');

    // Verify copy button functionality
    assert(bookingCode.includes('handleCopyRef'), 'Booking.jsx must have handleCopyRef clipboard handler');
    assert(bookingCode.includes('navigator.clipboard.writeText'), 'handleCopyRef must write to clipboard');
    console.log('       Asserted: Reference formatting (#PC-XXXXXX) and clipboard copy handler exist');
});

runTest('Feature 18: Booking.jsx displays stay summary card with all required reservation details', () => {
    const bookingPath = path.join(ROOT_DIR, 'src', 'components', 'Booking.jsx');
    const bookingCode = fs.readFileSync(bookingPath, 'utf-8');

    // Check completion view state gating
    assert(bookingCode.includes('bookingComplete && confirmedBookingData'),
        'Booking.jsx must conditionally render completion screen when bookingComplete is true');

    // Check summary card fields
    assert(bookingCode.includes('Stay Summary'), 'Booking.jsx must render Stay Summary heading');
    assert(bookingCode.includes('confirmedBookingData.propertyName'), 'Summary card must show propertyName');
    assert(bookingCode.includes('formData.packageType'), 'Summary card must show packageType');
    assert(bookingCode.includes('formData.checkIn') && bookingCode.includes('formData.checkOut'), 'Summary card must show dates');
    assert(bookingCode.includes('confirmedBookingData.nights'), 'Summary card must show nights count');
    assert(bookingCode.includes('formData.guests'), 'Summary card must show guest count');
    assert(bookingCode.includes('formData.vegCount') && bookingCode.includes('formData.nonVegCount'),
        'Summary card must show veg and non-veg guest breakdown');
    assert(bookingCode.includes('confirmedBookingData.totalPrice'), 'Summary card must show total price');

    // Reassurance timeline
    assert(bookingCode.includes('What happens next?'), 'Booking.jsx must render reassurance steps');
    assert(bookingCode.includes('Zero Upfront Charges'), 'Booking.jsx must state zero upfront charges reassurance');

    console.log('       Asserted: Stay summary card displays property, package, dates, nights, meals, and pricing');
});

runTest('Feature 18: Booking.jsx provides fallback WhatsApp button and navigational recovery', () => {
    const bookingPath = path.join(ROOT_DIR, 'src', 'components', 'Booking.jsx');
    const bookingCode = fs.readFileSync(bookingPath, 'utf-8');

    // Fallback WhatsApp button
    assert(bookingCode.includes('Open WhatsApp Chat Again'), 'Booking.jsx must have "Open WhatsApp Chat Again" button');
    assert(bookingCode.includes('confirmedBookingData.whatsappUrl'), 'WhatsApp fallback button must link to whatsappUrl');

    // Secondary navigation actions
    assert(bookingCode.includes('Browse More Stays'), 'Booking.jsx must have "Browse More Stays" action');
    assert(bookingCode.includes('Make Another Booking'), 'Booking.jsx must have "Make Another Booking" reset action');
    assert(bookingCode.includes('handleResetBooking'), 'Booking.jsx must have handleResetBooking function');

    console.log('       Asserted: Fallback WhatsApp button and recovery navigation buttons present');
});

// ----------------------------------------------------------------------
// 6. Feature 19: Responsive Polish
// ----------------------------------------------------------------------
runTest('Feature 19: BookingManagement has min-w-[760px] table and mobile cards with meal badges', () => {
    const bmPath = path.join(ROOT_DIR, 'src', 'pages', 'manager', 'BookingManagement.jsx');
    assert(fs.existsSync(bmPath), 'src/pages/manager/BookingManagement.jsx must exist');
    const bmCode = fs.readFileSync(bmPath, 'utf-8');

    // Assert min-w-[760px]
    assert(bmCode.includes('min-w-[760px]'), 'BookingManagement table must have min-w-[760px]');

    // Assert mobile cards container
    assert(bmCode.includes('className="md:hidden flex flex-col gap-4 py-2"'),
        'BookingManagement must render mobile cards in md:hidden container');

    // Assert meal badges on mobile cards
    assert(bmCode.includes('b.vegGuests > 0 && <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-green-50 text-green-700">{b.vegGuests} Veg</span>'),
        'Mobile cards must display veg guest badge');
    assert(bmCode.includes('b.nonVegGuests > 0 && <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-700">{b.nonVegGuests} Non-Veg</span>'),
        'Mobile cards must display non-veg guest badge');

    // Assert responsive export buttons
    assert(bmCode.includes('flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto'),
        'Export controls must be flex-col on mobile and sm:flex-row on desktop');

    console.log('       Asserted: min-w-[760px], mobile cards, and meal badges in BookingManagement');
});

runTest('Feature 19: OwnerDashboard has mobile cards for confirmed bookings and scrollable tab pills', () => {
    const odPath = path.join(ROOT_DIR, 'src', 'pages', 'OwnerDashboard.jsx');
    assert(fs.existsSync(odPath), 'src/pages/OwnerDashboard.jsx must exist');
    const odCode = fs.readFileSync(odPath, 'utf-8');

    // Assert scrollable tab pills
    assert(odCode.includes('overflow-x-auto scrollbar-hide'),
        'OwnerDashboard tab bar must use overflow-x-auto scrollbar-hide for mobile horizontal scrolling');

    // Assert mobile card view for confirmed bookings
    assert(odCode.includes('className="md:hidden flex flex-col gap-3 p-4"'),
        'OwnerDashboard must have md:hidden mobile card view for bookings');

    // Assert desktop table min-w
    assert(odCode.includes('min-w-[650px]'), 'OwnerDashboard confirmed bookings table must have min-w-[650px]');
    assert(odCode.includes('min-w-[540px]'), 'OwnerDashboard revenue table must have min-w-[540px]');

    console.log('       Asserted: scrollable tab pills and mobile card layout in OwnerDashboard');
});

// ----------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------
console.log('================================================================');
console.log(`   ALL ${passedTests} EMPIRICAL TESTS PASSED OUT OF ${totalTests}`);
console.log('================================================================\n');
