
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 1; // Admin user ID usually

async function runTrackingTest() {
    console.log('🚀 Starting Tracking Link Test...');

    // 1. Create a tracking link
    console.log('\n1. Creating tracking link...');
    const createRes = await fetch(`${BASE_URL}/api/tracking/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: TEST_USER_ID,
            originalUrl: 'https://google.com',
            subreddit: 'test_sub',
            postId: 'test_post_123',
            type: 'comment'
        })
    });

    if (!createRes.ok) {
        console.error('❌ Failed to create link:', await createRes.text());
        return;
    }

    const linkData = await createRes.json();
    console.log('✅ Link Created:', linkData);
    const trackingId = linkData.id;
    const trackingUrl = linkData.trackingUrl;

    // 2. Simulate clicks
    console.log('\n2. Simulating 3 clicks...');
    for (let i = 1; i <= 3; i++) {
        const clickRes = await fetch(`${BASE_URL}/t/${trackingId}`);
        if (clickRes.ok) {
            console.log(`   Click ${i}: OK (Redirecting...)`);
        } else {
            console.error(`   Click ${i}: FAILED`);
        }
    }

    // Small delay to ensure settings are saved (debounce is 500ms in server)
    console.log('\nWaiting for server to persist data...');
    await new Promise(r => setTimeout(r, 1000));

    // 3. Verify analytics via API
    console.log('\n3. Verifying analytics via API...');
    const analyticsRes = await fetch(`${BASE_URL}/api/tracking/user/${TEST_USER_ID}`);
    const userLinks = await analyticsRes.json();

    const ourLink = userLinks.find(l => l.id === trackingId);
    if (ourLink) {
        console.log('📈 Analytics Result:');
        console.log(`   Original URL: ${ourLink.originalUrl}`);
        console.log(`   Expected Clicks: 3`);
        console.log(`   Actual Clicks: ${ourLink.clicks}`);

        if (ourLink.clicks === 3) {
            console.log('\n🌟 TEST PASSED: Tracking link flow is working perfectly!');
        } else {
            console.log('\n⚠️ TEST PARTIAL: Clicks registered but count mismatch.');
        }
    } else {
        console.error('❌ FAILED: Created link not found in user analytics.');
    }
}

runTrackingTest().catch(err => console.error('FATAL ERROR:', err));
