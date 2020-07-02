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

async function fetchIlbecon() {
  const { data: res } = await axios.get(
    `https://nomunyan.github.io/ilbecon/ilbecon.json`
  );
  return res.data;
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
    select(val) {
      this.selected = val;
      this.$emit("change", val);
    },
  },
});

Vue.component("ilbecon-item", {
  template: `
<span class="comment-image-box">
<span>
  <img class="img-landscape" :src="image"
       style="visibility: visible; cursor: pointer;" onload="showImage(this)" @click="$emit('click')">
</span>
</span>
`,
  props: ["image"],
});

Vue.component("ilbecon-list", {
  template: `
<div class="aside-section" style="cursor: pointer; margin-bottom: 10px;" :style="open ? [] : closeStyle">
  <h3 @click="open = !open" style="text-align: left; padding-left: 10px;">
    {{ data.title }}
    <span @click.stop="$emit('toggle-favorite', data.id)" class="ico-bookmark" :class="{ 'mark-on': favoriteIds.includes(data.id) }" style="margin-left: 6px;"></span>
  </h3>
  <ilbecon-item v-for="image in data.images" :image="image" @click="$emit('selected', image)" />
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
<div id="ilbeconApp" style="width: 750px; height: 550px; overflow: auto; margin-top: -30px; padding: 10px;">
<my-tab @change="changeTab" :selected="selTab"/>
<div style="border: 1px solid #e2e2e2; padding: 10px; margin-top: -1px; background: #e9e9e9;">
  <template  v-if="selTab === '검색'">
    <div class="post-search-wrap" style="margin-top: 0; margin-bottom: 20px;">
      <input ref="searchInput" @keyup.enter="query=$refs.searchInput.value" type="text" name="ilbecon_search">
      <button class="btn-default btn-search" @click="query=$refs.searchInput.value"><span>검색</span></button>
    </div>
    <ilbecon-list v-for="ilbecon in searchList" :data="ilbecon" :favorite-ids="favoriteIds" @toggle-favorite="toggleFavorite" @selected="selected" />
  </template>
  <template v-else-if="selTab === '즐겨찾기'">
    <ilbecon-list v-for="ilbecon in favoriteList" :data="ilbecon" :favorite-ids="favoriteIds" @toggle-favorite="toggleFavorite" @selected="selected" />
  </template>
</div>
</div>
`
    );
    const app = new Vue({
      el: "#ilbeconApp",
      data: {
        query: "",
        favoriteIds: [],
        ilbeconList: [],
        selTab: "즐겨찾기",
        reIlbecon: /https:\/\/ncache\.ilbe\.com\/files\/attach\/(?:cmt|new)\/\d*\/\d*\/\d*\/\d*\/.*_(.*)\..*/g,
      },
      async created() {
        this.favoriteIds = JSON.parse(
          localStorage.getItem("favoriteIds") || "[]"
        );
        this.ilbeconList = await fetchIlbecon();
      },
      computed: {
        favoriteList() {
          return this.ilbeconList.filter((val) =>
            this.favoriteIds.includes(val.id)
          );
        },
        searchList() {
          return this.ilbeconList.filter(
            (val) => val.tags.includes(this.query) || val.title === this.query
          );
        },
      },
      methods: {
        changeTab(val) {
          this.selTab = val;
        },
        close() {
          ilbeconPopup.close();
        },
        async toggleFavorite(id) {
          if (this.favoriteIds.includes(id)) {
            this.favoriteIds = this.favoriteIds.filter((item) => item !== id);
          } else {
            this.favoriteIds = [...this.favoriteIds, id];
          }
          localStorage.setItem("favoriteIds", JSON.stringify(this.favoriteIds));
          await this.fetchFavorites();
        },
        selected(image) {
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
          img.setAttribute("src", image);
          img.setAttribute("onload", "showImage(this)");
          const inputSrl = document.querySelector(
            `#${dataForm} input[name=comment_file_srl]`
          );
          inputSrl.value = image.match(
            /https:\/\/(?:ncache|www)\.ilbe\.com\/files\/attach\/(?:cmt|new)\/\d*\/\d*\/.*\/\d*\/.*_(.*)\..*/i
          )[1];
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
