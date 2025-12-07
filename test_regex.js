const regex = /\b[a-zA-Z0-9._]{1,4}\*{3,}[a-zA-Z0-9._]{0,4}\b/;

const tests = [
    "f*****7",       // User's case -> Should match
    "a***",          // Minimum masked -> Should match
    "user***name",   // Standard -> Should match
    "*****5",        // Starts with stars -> Should match (0-4 end, but start requires 1-4... Wait, my regex says {1,4} at start. So *****5 should FAIL)
    "a*****",        // Ends with stars -> Should match
    "*****",         // Just stars -> Should FAIL (needs 1-4 chars at start)
    "Product is *****", // 5 star text -> Should FAIL
    "Variation: ***" // Should FAIL
];

console.log("Regex:", regex);
tests.forEach(t => {
    const match = t.match(regex);
    console.log(`'${t}' -> ${match ? 'MATCH: ' + match[0] : 'NO MATCH'}`);
});
