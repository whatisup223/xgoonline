
import fetch from 'node-fetch';

async function test() {
    const res = await fetch('http://localhost:3001/api/tracking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 2, originalUrl: 'https://marketation.online', subreddit: 'test', type: 'comment' })
    });
    const data = await res.json();
    console.log('Created:', data);

    const getRes = await fetch('http://localhost:3001/api/tracking/user/2');
    const links = await getRes.json();
    console.log('User 2 links:', links);
}
test();
