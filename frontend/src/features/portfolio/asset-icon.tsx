
import { useState } from "react";
import { Landmark, ChartNoAxesCombined, Layers, Gem, Bitcoin } from "lucide-react";
import { assetIconKey, type IconAsset } from "./lib/asset-icons";
import { categoryMeta, type FundGroup } from "./lib/portfolio";
import available from "../../../public/asset-icons/available.json";
const defaults = { cash: Landmark, stock: ChartNoAxesCombined, fund: Layers, gold: Gem, crypto: Bitcoin };
export default function AssetIcon({ asset, group, className = "asset-icon" }: { asset: IconAsset; group?: FundGroup; className?: string }) {
  const key = assetIconKey(asset, group);
  const [failed, setFailed] = useState<string | null>(null);
  const Icon = defaults[asset.category];
  const file = key ? (available as Record<string,string>)[key] : undefined;
  const hasLogo = key && file && failed !== key;
  return <span className={`${className} asset-symbol-icon ${hasLogo ? "has-logo" : ""}`} style={{color:categoryMeta[asset.category].color}} aria-hidden="true">
    {hasLogo ? <img src={`/asset-icons/${file}`} alt="" width={24} height={24} loading="lazy" onError={()=>setFailed(key)}/> : asset.category === "cash" && asset.currency ? <span className="currency-symbol-icon">{{SGD:"S$",USD:"$",CNY:"¥",HKD:"HK$"}[asset.currency]}</span> : asset.category === "stock" ? <span className="ticker-symbol-icon">{asset.symbol?.split(".")[0].slice(0,3) || <Icon size={19}/>}</span> : asset.category === "fund" ? <span className="ticker-symbol-icon">{asset.name.slice(0,2)}</span> : <Icon size={19}/>}
  </span>;
}
