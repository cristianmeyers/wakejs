import { searchHosts } from "../api.js";

const globalSearch = document.getElementById("globalSearch");
const searchResults = document.getElementById("searchResults");

export function initSearch(roomsData, onTeleport) {
  globalSearch.addEventListener("input", async (e) => {
    const q = e.target.value;
    if (q.length < 2) {
      searchResults.classList.add("hidden");
      return;
    }

    try {
      const results = await searchHosts(q);
      if (results.length > 0) {
        searchResults.innerHTML = results
          .map(
            (h) => `
                    <div class="p-5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-50 dark:border-slate-800 last:border-0 flex justify-between items-center group" data-host="${h.id}" data-room="${h.room}">
                        <div class="pointer-events-none">
                            <div class="font-black text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${h.id}</div>
                            <div class="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest">${h.room}</div>
                        </div>
                        <i class="fas fa-arrow-right text-gray-200 dark:text-gray-700 group-hover:text-blue-500 transition-all pointer-events-none"></i>
                    </div>
                `,
          )
          .join("");

        searchResults.querySelectorAll("div[data-host]").forEach((el) => {
          el.onclick = () => {
            const { host, room } = el.dataset;
            teleport(host, room, roomsData, onTeleport);
          };
        });

        searchResults.classList.remove("hidden");
      } else {
        searchResults.innerHTML = `<div class="p-5 text-gray-400 italic text-center text-sm dark:bg-slate-900">Aucun résultat</div>`;
        searchResults.classList.remove("hidden");
      }
    } catch (e) {
      console.error("Search error", e);
    }
  });

  document.addEventListener("click", (e) => {
    if (!globalSearch.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add("hidden");
    }
  });
}

function teleport(hostId, roomName, roomsData, onTeleport) {
  globalSearch.value = "";
  searchResults.classList.add("hidden");

  let targetDept = null;
  let targetSite = null;

  for (const siteKey in roomsData.sites) {
    const depts = roomsData.sites[siteKey].departments;
    for (const deptName in depts) {
      if (depts[deptName].includes(roomName)) {
        targetDept = deptName;
        targetSite = siteKey;
        break;
      }
    }
  }

  if (targetDept && targetSite) {
    onTeleport(targetSite, targetDept, roomName, hostId);
  }
}
