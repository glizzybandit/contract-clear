// app/api/analyze/route.js
// Architecture: Detect → Interpret → AI writes (never decides)

// ─── 1. FEATURE DETECTION (pure pattern matching, no opinions) ───────────────
function detectFeatures(source) {
  const s = source.toLowerCase();
  return {
    mintable:          /function mint\b/.test(s),
    burnable:          /function burn\b/.test(s),
    pausable:          /function pause\b|whennotpaused/.test(s),
    upgradeable:       /delegatecall|upgradeable|uupsgradeable/.test(s),
    proxy:             /\bproxy\b/.test(s),
    ownable:           /onlyowner|ownable/.test(s),
    accessControl:     /accesscontrol|hasrole|grantrole/.test(s),
    blacklist:         /blacklist|blocklist|isblocked/.test(s),
    taxOrFee:          /settax|setfee|updatefee|_taxfee|_liquidityfee/.test(s),
    maxWallet:         /maxwallet|maxholding|maxbalance/.test(s),
    antiBot:           /antibot|antibotmode/.test(s),
    timelock:          /timelock|timelockcontroller/.test(s),
    multisig:          /multisig|gnosis/.test(s),
    renounced:         /renounceownership/.test(s),
    flashLoan:         /flashloan|flashmint/.test(s),
    selfDestruct:      /selfdestruct|suicide\(/.test(s),
  };
}

// ─── 2. DETERMINISTIC MEANING ENGINE ─────────────────────────────────────────
// Takes detected features and produces structured facts with meaning.
// NO guessing. Only states what was actually found or not found.
function buildFactSheet(features, isVerified, contractName) {
  const facts = [];
  const risks = [];
  const protections = [];

  // Source verification
  if (isVerified) {
    protections.push("Source code is publicly verified on Etherscan — anyone can audit it.");
  } else {
    risks.push("Source code is NOT verified. The contract logic cannot be reviewed or audited.");
  }

  // Minting
  if (features.mintable) {
    risks.push("Minting function detected. New tokens can be created, which could dilute supply.");
  } else {
    facts.push("No mint function detected — token supply appears fixed.");
  }

  // Pausing
  if (features.pausable) {
    risks.push("Pause function detected. Trading or transfers could be halted by an admin.");
  } else {
    facts.push("No pause function detected — trading cannot be frozen by an admin.");
  }

  // Upgradeability
  if (features.upgradeable || features.proxy) {
    risks.push("Upgrade or proxy pattern detected. Contract logic could be replaced by the deployer.");
  } else {
    facts.push("No upgrade mechanism detected — contract logic is fixed and cannot be swapped.");
  }

  // Owner control
  if (features.ownable || features.accessControl) {
    if (features.renounced) {
      protections.push("Ownership renounce function present — deployer may have given up control.");
    } else {
      risks.push("Owner/admin role detected. A privileged address has elevated control over this contract.");
    }
  } else {
    facts.push("No owner or admin role detected — no single address has privileged control.");
  }

  // Blacklist
  if (features.blacklist) {
    risks.push("Blacklist function detected. Specific wallet addresses can be blocked from transacting.");
  } else {
    facts.push("No blacklist function detected — wallets cannot be blocked from transacting.");
  }

  // Tax / Fee
  if (features.taxOrFee) {
    risks.push("Fee or tax function detected. Transaction costs may be changeable by the owner.");
  }

  // Self destruct
  if (features.selfDestruct) {
    risks.push("Self-destruct function detected. The contract could be destroyed by a privileged address.");
  }

  // Flash loan
  if (features.flashLoan) {
    facts.push("Flash loan capability detected — common in DeFi lending protocols.");
  }

  // Protections
  if (features.timelock) {
    protections.push("Timelock detected — admin changes require a delay before taking effect.");
  }
  if (features.multisig) {
    protections.push("Multisig pattern detected — critical actions require multiple approvals.");
  }

  return { facts, risks, protections };
}

// ─── 3. DETERMINISTIC RISK SCORE ─────────────────────────────────────────────
// Score is calculated from facts only, never from AI output.
function calculateRisk(features, isVerified) {
  let score = 0;

  if (!isVerified)           score += 30;
  if (features.mintable)     score += 20;
  if (features.pausable)     score += 15;
  if (features.blacklist)    score += 15;
  if (features.selfDestruct) score += 20;
  if (features.upgradeable || features.proxy) score += 12;
  if (features.taxOrFee)     score += 10;
  if ((features.ownable || features.accessControl) && !features.renounced) score += 10;

  // Deductions for safety features
  if (features.timelock)     score -= 10;
  if (features.multisig)     score -= 10;
  if (features.renounced)    score -= 8;
  if (isVerified)            score -= 5;

  score = Math.max(0, Math.min(100, score));

  let riskLevel = "LOW";
  if (score >= 70)      riskLevel = "CRITICAL";
  else if (score >= 45) riskLevel = "HIGH";
  else if (score >= 20) riskLevel = "MEDIUM";

  return { score, riskLevel };
}

// ─── 4. BUILD AI PROMPT (AI is writer only — all facts pre-determined) ────────
function buildPrompt(contractName, isVerified, features, factSheet, riskScore, riskLevel) {
  // Serialize detected features as hard facts for the AI
  const detectedList = [
    `Verified on Etherscan: ${isVerified ? "YES" : "NO"}`,
    `Mintable: ${features.mintable ? "YES — mint function found" : "NO"}`,
    `Pausable: ${features.pausable ? "YES — pause function found" : "NO"}`,
    `Upgradeable/Proxy: ${(features.upgradeable || features.proxy) ? "YES — proxy or upgrade pattern found" : "NO"}`,
    `Owner/Admin role: ${(features.ownable || features.accessControl) ? "YES" : "NO"}`,
    `Ownership renounced: ${features.renounced ? "YES" : "NO"}`,
    `Blacklist: ${features.blacklist ? "YES — blacklist function found" : "NO"}`,
    `Tax/Fee functions: ${features.taxOrFee ? "YES — changeable fee detected" : "NO"}`,
    `Self-destruct: ${features.selfDestruct ? "YES — CRITICAL" : "NO"}`,
    `Timelock: ${features.timelock ? "YES" : "NO"}`,
    `Multisig: ${features.multisig ? "YES" : "NO"}`,
  ].join("\n");

  const risksText    = factSheet.risks.length > 0       ? factSheet.risks.join("\n")       : "None detected.";
  const factsText    = factSheet.facts.length > 0        ? factSheet.facts.join("\n")        : "None.";
  const protectText  = factSheet.protections.length > 0  ? factSheet.protections.join("\n")  : "None detected.";

  return `You are a smart contract analyst writing a summary for a NON-TECHNICAL crypto user.

You have been given a pre-analyzed report. Your ONLY job is to write a clear, plain-English paragraph that explains what this contract does and what the findings mean for a regular user.

STRICT RULES:
- You MUST base your summary ONLY on the findings below. Do NOT add risks or warnings that are not in the findings.
- If a risk was NOT detected, do NOT mention it or imply it could exist.
- If no risks were found, say so clearly and confidently. Do not hedge.
- NEVER say "could potentially", "may", "might" unless the finding itself is uncertain.
- NEVER mention SafeMath, libraries, or Solidity implementation details.
- NEVER say "always do your research" or "exercise caution" as a filler.
- Write 3-4 sentences max. Be direct and specific.

CONTRACT: "${contractName}"
RISK SCORE: ${riskScore}/100 (${riskLevel} RISK)

DETECTED FEATURES:
${detectedList}

CONFIRMED RISKS (detected by code analysis):
${risksText}

CONFIRMED SAFE SIGNALS (detected by code analysis):
${factsText}

PROTECTIONS FOUND:
${protectText}

Now write a plain-English summary paragraph that accurately reflects ONLY the above findings. End with a one-sentence verdict.`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { address } = await req.json();

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return Response.json({ error: "Invalid Ethereum address" }, { status: 400 });
    }

    const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY;
    const OPENAI_KEY    = process.env.OPENAI_API_KEY;

    if (!ETHERSCAN_KEY) return Response.json({ error: "Missing ETHERSCAN_API_KEY" }, { status: 500 });
    if (!OPENAI_KEY)    return Response.json({ error: "Missing OPENAI_API_KEY"    }, { status: 500 });

    // ── Fetch contract source ─────────────────────────────────────────────────
    const sourceRes = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_KEY}`
    );
    const sourceData = await sourceRes.json();

    if (sourceData.status !== "1" || !sourceData.result?.[0]) {
      return Response.json({ error: "Could not fetch contract from Etherscan. Check the address." }, { status: 400 });
    }

    const contractInfo = sourceData.result[0];
    const sourceCode   = contractInfo.SourceCode || "";
    const isVerified   = sourceCode.length > 0;
    const contractName = contractInfo.ContractName || "Unknown Contract";
    const compiler     = contractInfo.CompilerVersion || "";

    // ── Fetch bytecode size ───────────────────────────────────────────────────
    let bytecodeSize = 0;
    try {
      const codeRes = await fetch(`https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`);
      const codeData = await codeRes.json();
      const hex = codeData.result || "0x";
      bytecodeSize = Math.floor((hex.length - 2) / 2);
    } catch (e) { console.log("bytecode fetch failed", e); }

    // ── Fetch creation date ───────────────────────────────────────────────────
    let creationDate = "";
    try {
      const txRes  = await fetch(`https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&page=1&offset=1&apikey=${ETHERSCAN_KEY}`);
      const txData = await txRes.json();
      const first  = txData.result?.[0];
      if (first?.timeStamp) {
        creationDate = new Date(parseInt(first.timeStamp) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      }
    } catch (e) { console.log("creation date fetch failed", e); }

    // ── Run deterministic analysis ────────────────────────────────────────────
    const features   = detectFeatures(sourceCode);
    const factSheet  = buildFactSheet(features, isVerified, contractName);
    const { score: riskScore, riskLevel } = calculateRisk(features, isVerified);

    // Build permissions list for UI from factSheet
    const permissions = [
      ...factSheet.risks.map(r => ({ label: r.split(".")[0], description: r, severity: "danger" })),
      ...factSheet.protections.map(p => ({ label: p.split(".")[0], description: p, severity: "info" })),
    ];

    // Build features list for UI
    const featuresList = [
      { label: "Mintable",          detected: features.mintable },
      { label: "Burnable",          detected: features.burnable },
      { label: "Pausable",          detected: features.pausable },
      { label: "Upgradeable Proxy", detected: features.upgradeable || features.proxy },
      { label: "Ownable",           detected: features.ownable },
      { label: "Access Control",    detected: features.accessControl },
      { label: "Blacklist",         detected: features.blacklist },
      { label: "Tax / Fee",         detected: features.taxOrFee },
      { label: "Max Wallet",        detected: features.maxWallet },
      { label: "Anti-bot",          detected: features.antiBot },
      { label: "Timelock",          detected: features.timelock },
      { label: "Multisig",          detected: features.multisig },
      { label: "Self-Destruct",     detected: features.selfDestruct },
      { label: "Flash Loan",        detected: features.flashLoan },
    ];

    // Build risk reasons from factSheet
    const riskReasons = [
      ...factSheet.risks,
      ...factSheet.protections,
    ];

    // ── AI writes the summary (does NOT decide risk) ──────────────────────────
    let aiSummary = "AI summary unavailable. Review the risk and permissions sections below.";
    try {
      const prompt = buildPrompt(contractName, isVerified, features, factSheet, riskScore, riskLevel);

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 220,
          temperature: 0.2, // Low temperature = consistent, factual, not creative
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const aiData = await aiRes.json();
      if (aiData.choices?.[0]?.message?.content) {
        aiSummary = aiData.choices[0].message.content.trim();
      } else if (aiData.error) {
        console.log("OpenAI error:", aiData.error);
      }
    } catch (e) {
      console.log("AI fetch failed:", e);
    }

    // ── Return result ─────────────────────────────────────────────────────────
    return Response.json({
      contractName,
      contractAddress: address,
      isVerified,
      compiler,
      aiSummary,
      riskLevel,
      riskScore,
      riskReasons,
      permissions,
      features: featuresList,
      technicalDetails: {
        sourceCode: sourceCode.slice(0, 8000),
        bytecodeSize,
        creationDate,
      },
    });

  } catch (err) {
    console.log("Route crash:", err);
    return Response.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}