/**
 * Smart Crowd Navigator Assistant - Core Engine
 */

const DEFAULT_DATA_PATH = './data.json';
const FIREBASE_REST_URL = 'https://crowd-navigator-default-rtdb.asia-southeast1.firebasedatabase.app/.json';

/**
 * Fetch real-time data from Firebase. Falls back to data.json gracefully.
 */
async function fetchStadiumData() {
    try {
        const response = await fetch(FIREBASE_REST_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        
        // Ensure our expected data structure exists, else throw to fallback
        if (!data || (!data.gates && !data.foodStalls && !data.paths)) {
            throw new Error("Missing required data collections from Firebase.");
        }
        return data;
    } catch (error) {
        console.warn('⚠️ Firebase pull failed. Using local data.json fallback...', error.message);
        try {
            if (typeof window === 'undefined') {
                const fs = require('fs');
                return JSON.parse(fs.readFileSync(DEFAULT_DATA_PATH, 'utf-8'));
            } else {
                const fallbackResponse = await fetch(DEFAULT_DATA_PATH);
                return await fallbackResponse.json();
            }
        } catch (localError) {
            console.error('❌ Critical Error: Could not load fallback data.');
            return null;
        }
    }
}

/**
 * Core AI Decision Engine Engine
 */
function analyzeOptions(userContext, data) {
    const { intent } = userContext; // location ignored locally as distanceFromUser handles it
    let options = [];
    let scoreFn;

    // Route logic depending on user intent 
    if (intent === 'entry' || intent === 'exit') {
        if (!data.gates) return buildErrorResponse("Missing Gate data.");
        
        // Convert to array
        options = Object.keys(data.gates).map(key => ({ id: key, ...data.gates[key] }));
        
        // Filter out completely closed gates
        options = options.filter(g => g.status !== 'closed');
        
        // Scoring Math: density + distance impact (entry/exit). Heavy penalty for 'congested' flag.
        scoreFn = (item) => {
            let penalty = item.status === 'congested' ? 200 : 0;
            return item.crowdDensity + (item.distanceFromUser * 2) + penalty;
        };

    } else if (intent === 'food' || intent === 'restroom') {
        if (!data.foodStalls) return buildErrorResponse("Missing Facilities data.");
        
        options = Object.keys(data.foodStalls).map(key => ({ id: key, ...data.foodStalls[key] }));
        
        // Scoring Math: Severe penalty for waiting. Multiplier makes Wait Time the governing factor.
        scoreFn = (item) => {
            return (item.waitTime * 4) + item.crowdDensity;
        };

    } else if (intent === 'navigation') {
        if (!data.paths) return buildErrorResponse("Missing Path data.");
        
        options = Object.keys(data.paths).map(key => ({ id: key, ...data.paths[key] }));
        
        // Scoring Math: Congestion and estimated time heavily factored.
        scoreFn = (item) => {
            return (item.congestionLevel * 2) + (item.estimatedTime * 6);
        };
    } else {
        return buildErrorResponse("Unknown intent provided.");
    }

    if (options.length === 0) return buildErrorResponse("No available options at this time.");

    // Multi-factor mapping 
    const scoredOptions = options.map(opt => ({
        ...opt,
        score: scoreFn(opt)
    }));

    // Sort lowest algorithm cost to the top
    scoredOptions.sort((a, b) => a.score - b.score);

    const best = scoredOptions[0];
    const alternative = scoredOptions[1] || null;

    // Reason Generator based on logic type
    let reason = "";
    if (intent === 'entry' || intent === 'exit') {
        reason = `Identified optimal flow via ${best.name}. Mapped at ${best.crowdDensity}% density with minimal transit distance (${best.distanceFromUser} points).`;
    } else if (intent === 'food' || intent === 'restroom') {
        reason = `Routing to ${best.name} avoids congestion. Estimated strict wait time is ${best.waitTime} mins with a crowd density of ${best.crowdDensity}%.`;
    } else if (intent === 'navigation') {
        reason = `Selected ${best.name}. Lowest projected transit time (${best.estimatedTime} mins) intersecting minimal pathway congestion (${best.congestionLevel}%).`;
    }

    // Safety Alert Context Injection - Appends stadium alerts intelligently
    if (data.alerts) {
        const alertVals = Object.values(data.alerts);
        if(alertVals.length > 0 && reason.length < 150) { 
            reason += ` System Note: ${alertVals[0]}`;
        }
    }

    // Assign rigid Confidence string requirements
    let confidence = "Low";
    if (best.score < 60) confidence = "High";
    else if (best.score < 130) confidence = "Medium";

    return {
        recommended_action: best.name,
        reason: reason,
        alternative_option: alternative ? alternative.name : "None available",
        confidence: confidence
    };
}

/**
 * Standard Error Payload Builder
 */
function buildErrorResponse(msg = "Unavailable") {
    return {
        recommended_action: "Remain at Current Location",
        reason: `System diagnostic failure: ${msg}`,
        alternative_option: "N/A",
        confidence: "Low"
    };
}

/**
 * Primary Exporter Hook
 */
async function getSmartRecommendation(userContext) {
    const data = await fetchStadiumData();
    if (!data) return buildErrorResponse("Unable to fetch mapping infrastructure.");
    return analyzeOptions(userContext, data);
}

// ==========================================
// TESTING / DEMONSTRATION MODULE
// ==========================================
async function runTestCases() {
    console.log("🏟️  Executing Smart Crowd Navigator Logic Validation...\n");
    
    const cases = [
        { name: "Entry Routing Simulation", context: { location: "GateA", intent: "entry" } },
        { name: "Food Request Simulation", context: { location: "GateC", intent: "food" } },
        { name: "Fast Exit Simulation", context: { location: "GateB", intent: "exit" } },
        { name: "Path Navigation Simulation", context: { location: "GateA", intent: "navigation" } }
    ];

    for (let c of cases) {
        console.log(`--- Scenario: ${c.name} ---`);
        console.log(`Input Context Context:`, c.context);
        const res = await getSmartRecommendation(c.context);
        console.log(`JSON Result Engine Output:\n`, JSON.stringify(res, null, 2));
    }
}

// NodeJS Module Runner Execution
if (typeof require !== 'undefined' && require.main === module) {
    runTestCases();
}

// Browser Window Hook
if (typeof window !== 'undefined') {
    window.getSmartRecommendation = getSmartRecommendation;
}
