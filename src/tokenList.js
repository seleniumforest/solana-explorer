import axios from "axios";

let cache;

export const getTokens = async () => {
    if (cache)
        return cache;

    //https://decommas.io/gears/app/api/tokens 
    let response = await axios.get("/tokenlist.json");
    let tokenlist = response.data.map(x => ({
        address: x.address,
        symbol: x.symbol
    }));

    cache = tokenlist;
    return cache;
}