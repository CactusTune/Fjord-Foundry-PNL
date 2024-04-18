import { ethers } from "ethers";
import dotenv from "dotenv";
import abi from "../contract_abi/gemai.json";

dotenv.config();

interface UserBalances {
  buyVolume: number;
  sellVolume: number;
  totalTrades: number;
  usdtBalance: number;
  gemaiBalance: number;
  PNL?: number;
}

async function main() {
  const API_URL = process.env.LIVE_API_URL;
  const contract_address = process.env.CONTRACT_ADDRESS as string;

  const provider = new ethers.JsonRpcProvider(API_URL);
  const contract_instance = new ethers.Contract(
    contract_address,
    abi,
    provider
  );

  const filter_buy = contract_instance.filters.Buy();
  const filter_sell = contract_instance.filters.Sell();

  const buy_events = await contract_instance.queryFilter(
    filter_buy,
    19633434,
    "latest"
  );
  const sell_events = await contract_instance.queryFilter(
    filter_sell,
    19633434,
    "latest"
  );

  const users: Record<string, UserBalances> = {};

  buy_events.forEach((event: any) => {
    const buyer: string = event.args?.[2]!;
    const gemaiAmount: number = parseFloat(
      ethers.formatUnits(event.args?.[2]!, 18)
    );

    const amount_bought: number = parseFloat(
      ethers.formatUnits(event.args?.[3]!, 6)
    );

    users[buyer] = users[buyer] || {
      buyVolume: 0,
      sellVolume: 0,
      totalTrades: 0,
      usdtBalance: 0,
      gemaiBalance: 0,
    };
    users[buyer].buyVolume += amount_bought;
    users[buyer].totalTrades++;
    users[buyer].gemaiBalance += gemaiAmount;
  });

  sell_events.forEach((event: any) => {
    const seller: string = event.args?.[0]!;
    const gemaiAmount: number = parseFloat(
      ethers.formatUnits(event.args?.[2]!, 18)
    );
    const amount_received: number = parseFloat(
      ethers.formatUnits(event.args?.[1]!, 18)
    );

    users[seller] = users[seller] || {
      buyVolume: 0,
      sellVolume: 0,
      totalTrades: 0,
      usdtBalance: 0,
      gemaiBalance: 0,
    };
    users[seller].sellVolume += amount_received;
    users[seller].totalTrades++;
    users[seller].usdtBalance += amount_received;
    users[seller].gemaiBalance += gemaiAmount;
  });

  for (const user in users) {
    users[user].PNL = users[user].sellVolume - users[user].buyVolume;
  }

  console.table(
    Object.entries(users).map(([user, data]) => ({
      User: user,
      USDT: data.usdtBalance.toFixed(2),
      GEMAI: data.gemaiBalance.toFixed(2),
      BuyVolume: data.buyVolume.toFixed(2),
      SellVolume: data.sellVolume.toFixed(2),
      TotalTrades: data.totalTrades,
      PNL: data.PNL,
    }))
  );
}

main().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
