import { data } from "../docs/ilbecon.json";
import fs from "fs";
import { exit } from "process";

interface Ilbecon {
  id: number;
  title: string;
  tags: string[];
  author: string;
  source: string;
  images: string[];
}
interface Issue {
  num: number;
  body: string;
  state: string;
}

async function writeJSON(data: Ilbecon[]) {
  await fs.promises.writeFile(
    "docs/ilbecon.json",
    JSON.stringify({ data: data }, null, "  ")
  );
}

const ilbeconList = <Ilbecon[]>data;
const issue: Issue = {
  num: Number.parseInt(process.env.ISSUE_NUMBER || "-1"),
  body: process.env.ISSUE_BODY || "",
  state: process.env.ISSUE_STATE || "closed",
};
const reImage = /-\s*(?<image>https:\/\/(?:ncache|www)\.ilbe\.com\/files\/attach\/(?:cmt|new)\/\d*\/\d*\/.*\/\d*\/.*_(?<srl>.*)\..*)/g;
const reMetadata = /\|\s*(?<title>[^|]*)\s*\|\s*(?<author>[^|]*)\s*\|\s*(?<tags>[^|]*)\s*\|\s*(?<source>[^|]*)\s*\|/gi;
const imgMatches = [...issue.body.matchAll(reImage)];
const metaMatches = [...issue.body.matchAll(reMetadata)][2];
const foundIlbecon = ilbeconList.find((el) => el.id === issue.num);

(async () => {
  if (issue.state === "closed") {
    if (foundIlbecon) {
      ilbeconList.splice(ilbeconList.indexOf(foundIlbecon), 1);
    }
    await writeJSON(ilbeconList);
    return;
  }

  if (!metaMatches || imgMatches.length === 0)
    throw new Error("ilbecon syntax error!");

  if (foundIlbecon) {
    foundIlbecon.title = metaMatches.groups?.title.trim() || "";
    foundIlbecon.tags = <string[]>(
      JSON.parse(metaMatches.groups?.tags.trim() || "[]")
    );
    foundIlbecon.author = metaMatches.groups?.author.trim() || "";
    foundIlbecon.source = metaMatches.groups?.source.trim() || "";
    foundIlbecon.images = imgMatches.map(
      (match) => match.groups?.image.trim() || ""
    );
  } else {
    ilbeconList.push({
      id: issue.num,
      title: metaMatches.groups?.title.trim() || "",
      tags: <string[]>JSON.parse(metaMatches.groups?.tags.trim() || "[]"),
      author: metaMatches.groups?.author.trim() || "",
      source: metaMatches.groups?.source.trim() || "",
      images: imgMatches.map((match) => match.groups?.image.trim() || ""),
    });
  }
  await writeJSON(ilbeconList);
})()
  .then(() => console.log("done."))
  .catch((err) => {
    console.log(err.message);
    exit(1);
  });
