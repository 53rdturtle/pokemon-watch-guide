// Lists every episode (number + vid) of a Tencent Video cover. Usage: node tools/fetch-tencent-episodes.js <cid> <out.json>
// Find a cid by searching v.qq.com; it is the 15-char id in https://v.qq.com/x/cover/<cid>.html
const [cid, out] = process.argv.slice(2);
const H = { "Content-Type": "application/json", Origin: "https://v.qq.com", Referer: "https://v.qq.com/", "User-Agent": "Mozilla/5.0 Chrome/130" };
(async () => {
  const all = [];
  for (let p = 0; p < 20; p++) {
    const body = { page_params: { req_from: "web_vsite", page_id: "vsite_episode_list", page_type: "detail_operation", id_type: "1", cid, vid: "", lid: "", detail_page_type: "1", page_size: "30", page_num: String(p), page_context: "" }, has_cache: 1 };
    const j = await (await fetch("https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2&vversion_name=8.2.96", { method: "POST", headers: H, body: JSON.stringify(body) })).json();
    let items = [];
    for (const m of j?.data?.module_list_datas || []) for (const md of m.module_datas || []) items.push(...(md.item_data_lists?.item_datas || []));
    const eps = items.filter(i => i.item_params?.vid).map(i => ({ n: Number(i.item_params.title), vid: i.item_params.vid, play_title: i.item_params.play_title, union: i.item_params.union_title, trailer: i.item_params.is_trailer }));
    const fresh = eps.filter(e => !all.some(a => a.vid === e.vid));
    if (!fresh.length) break; all.push(...fresh);
  }
  require("fs").writeFileSync(out, JSON.stringify(all, null, 1));
  console.log(all.length, all.filter(e => e.trailer !== "0").length, "trailers");

})();
