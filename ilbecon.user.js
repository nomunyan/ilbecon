// ==UserScript==
// @name         ilbecon
// @namespace    https://github.com/nomunyan/ilbecon
// @version      0.1
// @description  일베콘
// @author       애게이
// @match        *://*.ilbe.com/view/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.0/dist/vue.min.js
// @require      https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
// ==/UserScript==

async function searchGithubIssues(repo, label, query) {
  const { data } = await axios.get("https://api.github.com/search/issues", {
    params: {
      q: `is:open repo:${repo} label:${label} ${query}`,
    },
  });
  return data;
}
async function getGithubIssue(repo, id) {
  const { data } = await axios.get(
    `https://api.github.com/repos/${repo}/issues/${id}`
  );
  return data;
}

Vue.component("my-tab", {
  template: `
<div :style="tabStyle">
<ul style="overflow: hidden;">
  <li v-for="page in pages"
      @click="select(page)"
      :style="page === selected ? [tabStyleList, tabStyleListOn] : tabStyleList">
    {{ page }}
  </li>
</ul>
</div>
`,
  props: ["selected"],
  data: () => ({
    pages: ["즐겨찾기", "검색"],
    tabStyle: {
      position: "relative",
      zIndex: "1",
      marginTop: "18px",
    },
    tabStyleList: {
      float: "left",
      height: "30px",
      lineHeight: "30px",
      padding: "0 16px",
      background: "#ccc",
      color: "#444",
      cursor: "pointer",
    },
    tabStyleListOn: {
      border: "1px solid #e2e2e2",
      borderBottom: "0",
      background: "#e9e9e9",
    },
  }),
  methods: {
    select: function (val) {
      this.selected = val;
      this.$emit("change", val);
    },
  },
});

Vue.component("ilbecon-item", {
  template: `
<span class="comment-image-box">
<span>
  <img class="img-landscape" :src="data.image"
       style="visibility: visible; cursor: pointer;" onload="showImage(this)" @click="$emit('click', data)">
</span>
</span>
`,
  props: ["data"],
});

Vue.component("ilbecon-list", {
  template: `
<div class="aside-section" v-for="ilbecon in data" style="cursor: pointer;" :style="open ? [] : closeStyle">
  <h3 @click="open = !open" style="text-align: left; padding-left: 10px;">
    {{ ilbecon.title }}
    <span @click.stop="$emit('toggle-favorite', ilbecon.id)" class="ico-bookmark" :class="{ 'mark-on': favoriteIds.includes(ilbecon.id) }"></span>
  </h3>
  <ilbecon-item v-for="item in ilbecon.item" :data="item" @click="$emit('selected', $event)" />
</div>
`,
  props: ["data", "favoriteIds"],
  data: () => ({
    open: false,
    closeStyle: {
      height: "25px",
      overflow: "hidden",
    },
  }),
});

(function (Vue, Popup, localStorage) {
  "use strict";
  window.chooserCommentIlbecon = function (el) {
    const dataForm = el.dataset.form;
    const ilbeconPopup = Popup.show(
      "일베콘 선택",
      `
<div id="ilbeconApp" style="width: 800px; max-height: 800px; overflow: scroll; margin-top: -30px; padding: 10px;">
<my-tab @change="changeTab" :selected="selTab"/>
<div style="border: 1px solid #e2e2e2; padding: 10px; margin-top: -1px; background: #e9e9e9;">
  <template  v-if="selTab === '검색'">
    <div class="post-search-wrap" style="margin-top: 0; margin-bottom: 20px;">
      <input type="text" name="ilbecon_search" v-model="query" @keyup.enter="search">
      <button class="btn-default btn-search" @click="search"><span>검색</span></button>
    </div>
    <ilbecon-list :data="searchList" :favorite-ids="favoriteIds" @toggle-favorite="toggleFavorite" @selected="selected" />
  </template>
  <ilbecon-list v-else-if="selTab === '즐겨찾기'" :data="favoriteList" :favorite-ids="favoriteIds" @toggle-favorite="toggleFavorite" @selected="selected" />
</div>
</div>
`
    );
    const app = new Vue({
      el: "#ilbeconApp",
      data: {
        query: "",
        favoriteIds: [],
        favoriteList: [],
        searchList: [],
        selTab: "즐겨찾기",
        reIlbecon: /- (?<image>https:\/\/ncache\.ilbe\.com\/files\/attach\/(?:cmt|new)\/\d*\/\d*\/\d*\/\d*\/.*_(?<srl>.*)\..*)/g,
      },
      created: async function () {
        this.favoriteIds = JSON.parse(
          localStorage.getItem("favoriteIds") || "[]"
        );
        await this.fetchFavorites();
      },
      methods: {
        changeTab: function (val) {
          this.selTab = val;
        },
        fetchFavorites: async function () {
          this.favoriteList = [];
          const result = [];
          for (const id of this.favoriteIds) {
            const issue = await getGithubIssue("nomunyan/ilbecon", id);
            const matches = [...issue.body.matchAll(this.reIlbecon)];
            result.push({
              id: issue.number,
              title: issue.title,
              item: matches.map((match) => ({
                image: match.groups.image,
                srl: match.groups.srl,
              })),
            });
          }
          this.favoriteList = result;
        },
        search: async function () {
          this.searchList = [];
          let data = await searchGithubIssues(
            "nomunyan/ilbecon",
            "ilbecon",
            this.query
          );
          if (data.total_count === 0) return;
          data = data.items.map((issue) => {
            const matches = [...issue.body.matchAll(this.reIlbecon)];
            return {
              id: issue.number,
              title: issue.title,
              item: matches.map((match) => ({
                image: match.groups.image,
                srl: match.groups.srl,
              })),
            };
          });
          this.searchList = data;
        },
        close: function () {
          ilbeconPopup.close();
        },
        toggleFavorite: async function (id) {
          if (this.favoriteIds.includes(id)) {
            this.favoriteIds = this.favoriteIds.filter((item) => item !== id);
          } else {
            this.favoriteIds = [...this.favoriteIds, id];
          }
          localStorage.setItem("favoriteIds", JSON.stringify(this.favoriteIds));
          await this.fetchFavorites();
        },
        selected: function (ilbecon) {
          const tr = document.getElementById(`comment-image-tr-${dataForm}`);
          const td = tr.getElementsByTagName("td")[0];
          td.classList.add("img-set");
          td.innerHTML = `<div class='comment-image-box'><span id='cmt_image_view_${dataForm}'></span></div><img src='/img/icon_x_orange.png' class='close-icon' onclick='removeCommentImage("${dataForm}")'>`;
          const imgView = document.getElementById(`cmt_image_view_${dataForm}`);
          imgView.innerHTML =
            "<img width='120' height='120' style='background:url(/img/loading.gif) no-repeat 50% 50%'>";
          const img = imgView.children[0];
          img.style.visibility = "hidden";
          img.removeAttribute("width");
          img.removeAttribute("height");
          img.setAttribute("src", ilbecon.image);
          img.setAttribute("onload", "showImage(this)");
          const inputSrl = document.querySelector(
            `#${dataForm} input[name=comment_file_srl]`
          );
          inputSrl.value = ilbecon.srl;
          this.close();
        },
      },
    });
  };

  function btnRegistration() {
    const targetNode = document.getElementById("comment_wrap_in");
    const config = { attributes: true, childList: true, subtree: false };
    const callback = function (mutationsList, observer) {
      const commentForms = document.getElementsByClassName(
        "comment-item comment-write"
      );
      for (const commentForm of commentForms) {
        const btnArea = commentForm.getElementsByClassName("btn-comment")[0];
        const dataForm = commentForm.getElementsByTagName("form")[0].id;
        if (btnArea.getElementsByClassName("btn-ilbecon").length !== 0) return;
        btnArea.innerHTML += `<button id="ilbecon" data-form="${dataForm}" class="btn-default btn-cmt-image btn-ilbecon" type="button" style="float:left;margin-left:6px;" onclick="chooserCommentIlbecon(this)"><span>일베콘</span></button>`;
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  }

  btnRegistration();
})(Vue, window.Popup, window.localStorage);
