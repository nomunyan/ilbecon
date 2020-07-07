// ==UserScript==
// @name         ilbecon
// @namespace    https://github.com/nomunyan/ilbecon
// @version      1.0.1
// @description  일베콘
// @author       애게이
// @match        *://*.ilbe.com/view/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.0/dist/vue.min.js
// ==/UserScript==

async function getInfo() {
  const res = await fetch("https://ilbecon.nomunyan.cyou/info", {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
  });
  return await res.json();
}

async function getFavoriteList(ids) {
  const res = await fetch("https://ilbecon.nomunyan.cyou/search", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { ids } }),
  });
  const { data, error } = await res.json();
  if (error) alert(error.message);
  return data;
}

async function searchIlbecon(query) {
  const res = await fetch("https://ilbecon.nomunyan.cyou/search", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { query } }),
  });
  const { data, error } = await res.json();
  if (error) alert(error.message);
  return data;
}

async function getIlbeImages(url) {
  const viewMatch = url.match(
    /^https?:\/\/(?:www\.)?ilbe\.com\/(?:view\/)?(\d*)/
  );
  if (!viewMatch) throw Error("올바르지 않은 게시글입니다.");

  const res = await fetch(`https://www.ilbe.com/view/${viewMatch[1]}`, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
  });
  if (res.ok) {
    const data = await res.text();
    const imgMatches = [
      ...data.matchAll(
        /<li><a href="\/file\/download\/(?<image>.*?)" target="_blank">(?<filename>.*) \(/gi
      ),
    ];
    return imgMatches.map(
      (m) => `https://www.ilbe.com/file/download/${m.groups.image}`
    );
  } else {
    throw Error("올바르지 않은 게시글입니다.");
  }
}

async function addIlbecon(ilbecon) {
  const res = await fetch("https://ilbecon.nomunyan.cyou/add", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: ilbecon }),
  });
  const resJSON = await res.json();
  if (resJSON.error) alert(resJSON.error.message);
  return resJSON;
}

async function getBlob(srl) {
  const res = await fetch(`https://www.ilbe.com/file/download/${srl}`, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
  });
  return [
    await res.blob(),
    res.headers.get("Content-Disposition").match(/filename="(.*)"/i)[1],
  ];
}

async function uploadIlbeImage(fname, blob) {
  const formdata = new FormData();
  formdata.append("upload", blob, fname);
  formdata.append("ckCsrfToken", window.csrf_val);
  const res = await fetch(
    "https://www.ilbe.com/file/imageupload?d=518&m=523&responseType=json",
    {
      method: "POST",
      body: formdata,
      redirect: "follow",
    }
  );
  const { error, url } = await res.json();
  if (error) alert(error.message);
  return `https://ncache.ilbe.com${url}`;
}

window.addRecentUseImage = function (image) {
  const recentUseImages = JSON.parse(
    localStorage.getItem("recentUseImages") || "[]"
  );
  recentUseImages.splice(0, 0, image);
  localStorage.setItem(
    "recentUseImages",
    JSON.stringify(recentUseImages.slice(0, 5))
  );
};

window.updateCommentBoxes = function () {
  const commentWrap = document.getElementsByClassName("post-comment-wrap")[0];
  const commentForms = commentWrap.getElementsByClassName(
    "comment-item comment-write"
  );
  for (const commentForm of commentForms) {
    const btnArea = commentForm.getElementsByClassName("btn-comment")[0];
    const dataForm = commentForm.getElementsByTagName("form")[0].id;
    if (btnArea.getElementsByClassName("btn-ilbecon").length === 0) {
      btnArea.children[0].addEventListener("click", () => {
        const img = document.getElementById(`cmt_image_view_${dataForm}`)
          .children[0];
        window.addRecentUseImage(img.getAttribute("src"));
      });
      btnArea.insertAdjacentHTML(
        "beforeend",
        `<button id="ilbecon" data-form="${dataForm}" class="btn-default btn-cmt-image btn-ilbecon" type="button" style="float:left;margin-left:6px;" onclick="chooserCommentIlbecon(this)"><span>일베콘</span></button>`
      );
    }
  }

  const favoriteImages = JSON.parse(
    localStorage.getItem("favoriteImages") || "[]"
  );
  const commentImageBoxes = commentWrap.getElementsByClassName(
    "comment-image-box"
  );
  for (const commentImageBox of commentImageBoxes) {
    const bookmark = commentImageBox.getElementsByClassName("ico-bookmark");
    if (bookmark.length !== 0) {
      const image = commentImageBox
        .getElementsByClassName("comment-image")[0]
        .getAttribute("src");
      if (favoriteImages.includes(image)) bookmark[0].classList.add("mark-on");
      else bookmark[0].classList.remove("mark-on");
    } else {
      const imageView = commentImageBox.children[0];
      const image = commentImageBox.children[0].children[0].getAttribute("src");

      imageView.insertAdjacentHTML(
        "afterbegin",
        `<span onclick="toggleLocalStorageFavoriteImage('${image}');" class="ico-bookmark ${
          favoriteImages.includes(image) ? "mark-on" : ""
        }" style="position: absolute; z-index: 1;"></span>`
      );
    }
  }
};

window.toggleLocalStorageFavoriteImage = function (image) {
  const favoriteImages = JSON.parse(
    localStorage.getItem("favoriteImages") || "[]"
  );
  const foundIndex = favoriteImages.findIndex((item) => item === image);
  if (foundIndex !== -1) favoriteImages.splice(foundIndex, 1);
  else favoriteImages.splice(0, 0, image);
  localStorage.setItem("favoriteImages", JSON.stringify(favoriteImages));
  window.updateCommentBoxes();
};

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
    pages: ["즐겨찾기", "검색", "일베콘 등록", "정보"],
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
    <span @click.stop="$emit('toggle-favorite-image')" class="ico-bookmark" :class="{ 'mark-on': favorite }" style="position: absolute; z-index: 1;"></span>
    <img class="img-landscape" :src="image + '?'"
        onerror="let src=this.src;this.src=src.substr(0, src.indexOf('?'))+'?t='+new Date().getTime();"
        style="visibility: visible; cursor: pointer; z-index: 0;" onload="showImage(this)" @click="$emit('click')">
  </span>
</span>
`,
  props: ["image", "favorite"],
});

Vue.component("ilbecon-list", {
  template: `
<div class="aside-section" style="margin-bottom: 10px; text-align: left;" :style="open ? [] : closeStyle">
  <h3 @click="open = !open" style="cursor: pointer; text-align: left; padding-left: 10px;">
    {{ title }}<template v-if="source"> - <a @click.stop="" :href="source" target="_blank">출처</a></template>
    <span v-if="!disableFavorite" @click.stop="$emit('toggle-favorite')" class="ico-bookmark" :class="{ 'mark-on': favorite }" style="margin-left: 6px;"></span>
  </h3>
  <ilbecon-item v-for="image in images" 
    :image="image"
    :favorite="favoriteImages.includes(image)"
    @click="$emit('selected', image)"
    @toggle-favorite-image="$emit('toggle-favorite-image', image)" />
</div>
`,
  props: {
    open: { type: Boolean, default: false },
    images: { type: Array },
    title: { type: String },
    source: { type: String },
    favorite: { type: Boolean },
    favoriteImages: { type: Array },
    disableFavorite: { type: Boolean, default: false },
  },
  data: () => ({
    closeStyle: {
      height: "25px",
      overflow: "hidden",
    },
  }),
});

Vue.component("register-ilbecon", {
  template: `
<div>
  <div class="post-search-wrap" style="margin-top: 0px; margin-bottom: 20px; font-size: 12pt; color: #444;">
    <div><input type="text" v-model="title" placeholder="일베콘 이름 입력" style="width: 400px; margin-bottom: 10px;"/></div>
    <div><input type="text" v-model="viewUrl" placeholder="게시글 URL 입력" style="width: 400px; margin-bottom: 10px;"/></div>
    <div><input type="text" v-model="tagStr" placeholder="태그 입력 콤마(,)로 구분" style="width: 400px;" /></div>
    <div style="float: right;"><button class="btn-default" @click="addIlbecon"><span>일베콘 등록</span></button>
  </div>
</div>
`,
  data: () => ({
    title: "",
    viewUrl: "",
    tagStr: "",
  }),
  methods: {
    async addIlbecon() {
      try {
        const images = await getIlbeImages(this.viewUrl);
        const res = await addIlbecon({
          title: this.title.trim(),
          source: this.viewUrl.trim(),
          tags: this.tagStr.split(",").map((el) => el.trim()),
          images,
        });
        if (res.data) {
          this.$emit("added");
        }
      } catch (err) {
        alert(err.message);
      }
    },
  },
});

(function (Vue, Popup, localStorage) {
  "use strict";
  window.chooserCommentIlbecon = function (el) {
    const dataForm = el.dataset.form;
    const ilbeconPopup = Popup.show(
      "일베콘 선택",
      `
<div id="ilbeconApp" style="width: 760px; height: 550px; overflow: auto; margin: -20px 10px 10px 10px;">
  <my-tab @change="changeTab" :selected="selTab"/>
  <div style="border: 1px solid #e2e2e2; padding: 10px; margin-top: -1px; background: #e9e9e9;">
    <template  v-if="selTab === '검색'">
      <div class="post-search-wrap" style="margin-top: 0; margin-bottom: 20px;">
        <input ref="searchInput" @keyup.enter="search($refs.searchInput.value)" type="text" name="ilbecon_search">
        <button class="btn-default btn-search" @click="search($refs.searchInput.value)"><span>검색</span></button>
      </div>
      <ilbecon-list v-for="ilbecon in searchList"
        :title="ilbecon.title"
        :source="ilbecon.source"
        :images="ilbecon.images"
        :favorite="favoriteIds.includes(ilbecon._id)"
        :favorite-images="favoriteImages"
        @toggle-favorite="toggleFavorite(ilbecon._id)"
        @toggle-favorite-image="toggleFavoriteImage"
        @selected="selected" />
    </template>
    <template v-else-if="selTab === '즐겨찾기'">
      <ilbecon-list
        title="최근사용"
        :images="recentUseImages"
        :favorite-images="favoriteImages"
        disable-favorite
        @toggle-favorite-image="toggleFavoriteImage"
        @selected="selected" />

      <ilbecon-list
        title="즐겨찾는 이미지"
        :images="favoriteImages"
        :favorite-images="favoriteImages"
        disable-favorite
        @toggle-favorite-image="toggleFavoriteImage"
        @selected="selected" />

      <ilbecon-list v-for="ilbecon in favoriteList"
        :title="ilbecon.title"
        :source="ilbecon.source"
        :images="ilbecon.images"
        :favorite-images="favoriteImages"
        :favorite="favoriteIds.includes(ilbecon._id)"
        @toggle-favorite="toggleFavorite(ilbecon._id)"
        @toggle-favorite-image="toggleFavoriteImage"
        @selected="selected" />
    </template>
    <template v-else-if="selTab === '일베콘 등록'">
      <register-ilbecon @added="added" />
    </template>
    <template v-else-if="selTab === '정보'">
      <h2 style="color: #666; font-size: 14pt; margin-bottom: 10px;">일베콘</h2><br/>
      <h3 style="color: #666; font-size: 10pt; margin-bottom: 10px;">즐겨찾기는 캐시삭제 하면 사라지니 주의.</h3><br/>
      <h3 style="color: #666; font-size: 10pt; margin-bottom: 10px;">현재 버전: {{ nowVersion }}</h3>
      <h3 style="color: #666; font-size: 10pt; margin-bottom: 10px;">최신 버전: {{ newVersion }}</h3>
      <template v-if="nowVersion !== newVersion">
        <a style="color: #666; font-size: 10pt; margin-bottom: 10px;" href="https://raw.githubusercontent.com/nomunyan/ilbecon/master/ilbecon.user.js" target="_blank">업데이트</a>
      </template>
      <a style="color: #666; font-size: 10pt; margin-bottom: 10px;" href="https://github.com/nomunyan/ilbecon" target="_blank">소스코드</a>
    </template>
  </div>
</div>
`
    );
    const app = new Vue({
      el: "#ilbeconApp",
      data: {
        nowVersion: GM_info.script.version,
        newVersion: "",
        favoriteIds: [],
        favoriteList: [],
        searchList: [],
        favoriteImages: [],
        recentUseImages: [],
        selTab: "즐겨찾기",
        reIlbecon: /^https:\/\/(?:ncache|www)\.ilbe\.com\/files\/attach\/(?:cmt|new)\/\d*\/\d*\/.*\/\d*\/.*_(.*)\.(?:jpe?g|png|gif)/i,
      },
      async created() {
        this.favoriteIds = JSON.parse(
          localStorage.getItem("favoriteIds") || "[]"
        );
        this.favoriteImages = JSON.parse(
          localStorage.getItem("favoriteImages") || "[]"
        );
        this.recentUseImages = JSON.parse(
          localStorage.getItem("recentUseImages") || "[]"
        );
        const { version } = await getInfo();
        this.newVersion = version || "정보를 불러오지 못함";

        this.fetchFavoriteList();
      },
      methods: {
        changeTab(val) {
          this.selTab = val;
        },
        close() {
          ilbeconPopup.close();
        },
        added() {
          this.selTab = "즐겨찾기";
          alert("일베콘이 등록되었습니다.");
        },
        async fetchFavoriteList() {
          this.favoriteList = await getFavoriteList(this.favoriteIds);
        },
        async search(query) {
          this.searchList = await searchIlbecon(query);
        },
        async toggleFavorite(id) {
          if (this.favoriteIds.includes(id)) {
            this.favoriteIds = this.favoriteIds.filter((item) => item !== id);
          } else {
            this.favoriteIds = [...this.favoriteIds, id];
          }
          localStorage.setItem("favoriteIds", JSON.stringify(this.favoriteIds));

          this.fetchFavoriteList();
        },
        toggleFavoriteImage(image) {
          toggleLocalStorageFavoriteImage(image);
          this.favoriteImages = JSON.parse(
            localStorage.getItem("favoriteImages") || "[]"
          );
        },
        async selected(image) {
          const tr = document.getElementById(`comment-image-tr-${dataForm}`);
          const td = tr.getElementsByTagName("td")[0];
          td.classList.add("img-set");
          td.innerHTML = `<div class='comment-image-box'><span id='cmt_image_view_${dataForm}'></span></div><img src='/img/icon_x_orange.png' class='close-icon' onclick='removeCommentImage("${dataForm}")'>`;
          const imgView = document.getElementById(`cmt_image_view_${dataForm}`);
          imgView.innerHTML =
            "<img width='120' height='120' style='background:url(/img/loading.gif) no-repeat 50% 50%;'>";
          this.close();

          let imgMatch = image.match(this.reIlbecon);
          if (!imgMatch)
            imgMatch = image.match(
              /^https:\/\/(?:www\.)?ilbe\.com\/file\/download\/(\d*)$/
            );
          const imgurl = await this.uploadImage(imgMatch[1]);
          const img = imgView.children[0];
          img.setAttribute("src", imgurl);
          img.setAttribute("onload", "showImage(this)");
          img.style.background = "none";
          const inputSrl = document.querySelector(
            `#${dataForm} input[name=comment_file_srl]`
          );
          inputSrl.value = imgurl.match(this.reIlbecon)[1];
        },
        async uploadImage(srl) {
          const [blob, filename] = await getBlob(srl);
          return uploadIlbeImage(filename, blob);
        },
      },
    });
  };

  function ilbeconRegistration() {
    const targetNode = document.getElementById("comment_wrap_in");
    const config = { attributes: true, childList: true, subtree: false };
    const observer = new MutationObserver(window.updateCommentBoxes);
    observer.observe(targetNode, config);
  }

  ilbeconRegistration();
})(Vue, window.Popup, window.localStorage);
