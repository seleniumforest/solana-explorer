let cache;

export const getTokens = async () => {
    if (cache)
        return cache;
        
    let response = await fetch("https://decommas.io/gears/app/api/tokens", { mode: "no-cors" });
    let json = await response.json();
    let tokenlist = json.map(x => ({
        address: x.address,
        symbol: x.symbol
    }));

    cache = tokenlist;
    return cache;
}