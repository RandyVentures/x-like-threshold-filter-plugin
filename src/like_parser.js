(() => {
  if (!window.XLTF) {
    window.XLTF = {};
  }

  const MAGNITUDE = {
    K: 1000,
    M: 1000000,
    B: 1000000000
  };

  window.XLTF.parseLikeCount = (rawText) => {
    if (!rawText) {
      return null;
    }

    const text = String(rawText).trim();
    const cleaned = text
      .replace(/likes?/i, "")
      .replace(/,/g, "")
      .trim();

    const match = cleaned.match(/^([0-9]*\.?[0-9]+)\s*([KMB])?$/i);
    if (!match) {
      return null;
    }

    const value = Number(match[1]);
    if (!Number.isFinite(value)) {
      return null;
    }

    const suffix = match[2] ? match[2].toUpperCase() : null;
    if (!suffix) {
      return Math.round(value);
    }

    const multiplier = MAGNITUDE[suffix];
    if (!multiplier) {
      return null;
    }

    return Math.round(value * multiplier);
  };
})();
