(function () {
  var CATALOGUE_URL = "https://superfabinc.com/catalogue/";
  var ENDPOINT = "/send-form.php";
  var FORM_PAGE = "form.html";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function pageKind() {
    var path = (location.pathname || "").toLowerCase();
    if (path.indexOf("/form") !== -1) return "catalogue";
    if (path.indexOf("career") !== -1) return "career";
    if (path.indexOf("contact") !== -1) return "contact";
    return "inquiry";
  }

  function formMarkup(type, id) {
    var title = "Quick Inquiry";
    var button = "Submit";
    if (type === "catalogue") {
      title = "Request Catalogue";
      button = "Get Catalogue";
    } else if (type === "contact") {
      title = "Contact Superfab";
      button = "Send Message";
    } else if (type === "career") {
      title = "Career";
      button = "Send";
    }
    var html =
      '<form class="sf-lead-form" data-form-type="' + type + '" id="' + id + '"' +
      (type === "career" ? ' enctype="multipart/form-data"' : "") + ">" +
      "<h2>" + title + "</h2>" +
      '<p class="sf-lead-intro">Share your details and our team will respond from info@superfabinc.com.</p>' +
      '<input type="text" name="website_url" class="sf-hp" tabindex="-1" autocomplete="off">' +
      '<label>Name<input type="text" name="name" required placeholder="Your Name"></label>' +
      '<label>Email<input type="email" name="email" required placeholder="Your Email"></label>' +
      '<label>Mobile<input type="tel" name="phone" required placeholder="Your Mobile No"></label>' +
      '<label>Company<input type="text" name="company" placeholder="Company Name"></label>' +
      '<label>Country<input type="text" name="country" placeholder="Country"></label>';
    if (type === "career") {
      html +=
        '<label>Description<textarea name="message" rows="4" placeholder="Description"></textarea></label>' +
        '<label>Resume<input type="file" name="resume" accept=".pdf,.doc,.docx" required></label>';
    } else {
      html += '<label>Message<textarea name="message" rows="4" placeholder="Your Message"></textarea></label>';
    }
    html +=
      captchaMarkup() +
      '<button type="submit">' + button + "</button>" +
      '<div class="sf-lead-status" role="status"></div></form>';
    return html;
  }

  function ensureStyles() {
    if (document.getElementById("sf-form-css")) return;
    var css = document.createElement("style");
    css.id = "sf-form-css";
    css.textContent =
      "#fixedInquiryBtn{position:fixed!important;left:18px!important;bottom:20px!important;top:auto!important;right:auto!important;z-index:999999!important}" +
      "#fixedInquiryBtn a{display:flex!important;align-items:center!important;background:linear-gradient(135deg,#007bff,#0047ab)!important;color:#fff!important;padding:16px 24px!important;font-size:15px!important;font-weight:700!important;border-radius:16px!important;text-decoration:none!important;box-shadow:0 10px 30px rgb(0 123 255 / .35)!important}" +
      "#fixedInquiryBtn a:hover{transform:scale(1.06)!important;color:#fff!important}" +
      "@media(max-width:768px){#fixedInquiryBtn{left:12px!important;bottom:18px!important}}" +
      ".sf-hp{position:absolute;left:-9999px;height:0;width:0;opacity:0}" +
      ".sf-lead-form h2{margin:0 0 8px;color:#0e77bc;font-size:24px}" +
      ".sf-lead-intro{margin:0 0 16px;color:#444;font-size:14px}" +
      ".sf-lead-form label{display:block;font-size:13px;font-weight:600;color:#222;margin:0 0 10px}" +
      ".sf-lead-form input,.sf-lead-form textarea,.sf-lead-form select{width:100%;box-sizing:border-box;margin-top:4px;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:14px;font-family:inherit}" +
      ".sf-lead-form button[type=submit],.sf-lead-form input[type=submit]{width:100%;margin-top:8px;background:linear-gradient(135deg,#007bff,#0047ab);color:#fff;border:0;border-radius:10px;padding:12px 16px;font-size:15px;font-weight:700;cursor:pointer}" +
      ".sf-lead-status{margin-top:12px;font-size:14px;line-height:1.5}" +
      ".sf-lead-status.ok{color:#0a7a32}" +
      ".sf-lead-status.err{color:#b42318}" +
      ".sf-page-form{max-width:520px;margin:0 0 24px;background:#fff;padding:24px 20px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.12)}" +
      ".sf-catalogue-link{display:inline-block;margin-top:8px;font-weight:700;color:#0e77bc}" +
      ".sf-captcha{margin:14px 0;padding:12px 0 4px}" +
      ".sf-captcha p,.sf-captcha .sf-captcha-label{margin:0 0 8px;font-size:13px;font-weight:600;color:#222}" +
      ".sf-captcha-row{display:flex;align-items:center;gap:10px;margin:0 0 8px}" +
      ".sf-captcha-img{display:block;height:48px;width:148px;background:#eef4fb;border:1px solid #d5e2ef;border-radius:6px}" +
      ".sf-captcha-refresh{background:#0e77bc;color:#fff;border:0;border-radius:8px;width:40px!important;height:40px;min-width:40px;margin:0!important;padding:0!important;cursor:pointer;font-size:18px;line-height:1;flex:0 0 40px}" +
      ".sf-captcha input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:14px}";
    document.head.appendChild(css);
  }

  function pinInquiryButton() {
    var btn = document.getElementById("fixedInquiryBtn");
    if (!btn) return;
    btn.style.setProperty("position", "fixed", "important");
    btn.style.setProperty("left", "18px", "important");
    btn.style.setProperty("bottom", "20px", "important");
    btn.style.setProperty("top", "auto", "important");
    btn.style.setProperty("right", "auto", "important");
    btn.style.setProperty("z-index", "999999", "important");
  }

  function captchaSrc() {
    return "captcha.php?t=" + Date.now();
  }

  function captchaMarkup() {
    return (
      '<div class="sf-captcha">' +
      '<p class="sf-captcha-label">Please, Enter Verification Code in the box:</p>' +
      '<div class="sf-captcha-row">' +
      '<img class="sf-captcha-img" src="' + captchaSrc() + '" alt="Verification code" width="148" height="48">' +
      '<button type="button" class="sf-captcha-refresh" aria-label="Refresh code">↻</button>' +
      "</div>" +
      '<input type="text" name="sf_captcha" required maxlength="8" placeholder="Enter code here" autocomplete="off">' +
      "</div>"
    );
  }

  function refreshCaptcha(form) {
    if (!form) return;
    var img = form.querySelector(".sf-captcha-img");
    if (img) img.src = captchaSrc();
    var input = form.querySelector('input[name="sf_captcha"]');
    if (input) input.value = "";
  }

  function wireCaptcha(form) {
    var btn = form.querySelector(".sf-captcha-refresh");
    if (btn && !btn.getAttribute("data-sf-wired")) {
      btn.setAttribute("data-sf-wired", "1");
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        refreshCaptcha(form);
      });
    }
  }

  function attachCaptcha(form) {
    if (!form) return;
    var oldBlock = null;
    var oldInput = form.querySelector('input[name="captcha-1"]');
    if (oldInput) oldBlock = oldInput.closest(".fullWidth");
    if (!oldBlock && form.querySelector(".wpcf7-captchac")) {
      oldBlock = form.querySelector(".wpcf7-captchac").closest(".fullWidth");
    }
    if (oldBlock) {
      oldBlock.className = "fullWidth sf-captcha-host";
      oldBlock.innerHTML = captchaMarkup();
    } else if (!form.querySelector('input[name="sf_captcha"]')) {
      var host = document.createElement("div");
      host.className = "sf-captcha-host";
      host.innerHTML = captchaMarkup();
      var submit = form.querySelector('input[type="submit"], button[type="submit"]');
      var wrap = submit && (submit.closest(".bottom-content") || submit.closest(".bt-contact") || submit.parentNode);
      if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(host, wrap);
      else form.appendChild(host);
    }
    wireCaptcha(form);
  }

  function showStatus(form, ok, text, extraHtml) {
    var box = form.querySelector(".sf-lead-status") || form.querySelector(".wpcf7-response-output");
    if (!box) {
      box = document.createElement("div");
      box.className = "sf-lead-status";
      form.appendChild(box);
    }
    box.className = "sf-lead-status " + (ok ? "ok" : "err");
    box.innerHTML = text + (extraHtml || "");
  }

  function makeCountryOptional(form) {
    var country = form.querySelector('input[name="country"]');
    if (!country) return;
    country.removeAttribute("required");
    country.removeAttribute("aria-required");
    country.classList.remove("wpcf7-validates-as-required");
    var wrap = country.closest(".halfBox, .fullWidth, .f-name") || country.parentNode;
    if (wrap && wrap.querySelector) {
      var star = wrap.querySelector(".cforms-required");
      if (star) star.parentNode.removeChild(star);
    }
  }

  function bindForm(form, typeOverride) {
    if (!form || form.getAttribute("data-sf-bound")) return;
    form.setAttribute("data-sf-bound", "1");
    makeCountryOptional(form);
    attachCaptcha(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      var type = typeOverride || form.getAttribute("data-form-type") || pageKind();
      var fd = new FormData(form);
      fd.set("form_type", type);
      fd.set("page_url", location.href);
      if (!fd.get("name")) fd.set("name", fd.get("your-name") || fd.get("contactPerson") || "");
      if (!fd.get("email")) fd.set("email", fd.get("your-email") || "");
      if (!fd.get("phone")) fd.set("phone", fd.get("your-phone") || fd.get("mobile-no") || fd.get("contactNo") || "");
      if (!fd.get("company")) fd.set("company", fd.get("companyName") || "");
      if (!fd.get("message")) {
        fd.set("message", fd.get("your-message") || fd.get("description") || fd.get("typeOfRequirement") || "");
      }
      var captchaVal = String(fd.get("sf_captcha") || fd.get("captcha-1") || "").trim();
      if (!captchaVal) {
        showStatus(form, false, "Please enter the verification code.");
        return;
      }
      var btn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) btn.disabled = true;
      showStatus(form, true, "Sending...");
      fetch(ENDPOINT, { method: "POST", body: fd, credentials: "same-origin" })
        .then(function (res) {
          return res.text().then(function (text) {
            var data = {};
            try { data = JSON.parse(text); } catch (err) { data = {}; }
            return { ok: res.ok && data.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            showStatus(form, false, (result.data && result.data.error) || "Please try again.");
            refreshCaptcha(form);
            return;
          }
          var extra = "";
          if (result.data.catalogue_url) {
            extra =
              ' <a class="sf-catalogue-link" href="' +
              result.data.catalogue_url +
              '" target="_blank" rel="noopener">' +
              result.data.catalogue_url +
              "</a>";
          }
          showStatus(form, true, result.data.message || "Thank you.", extra);
          try { form.reset(); } catch (err) {}
          refreshCaptcha(form);
        })
        .catch(function () {
          showStatus(form, false, "Could not send right now. Please email info@superfabinc.com");
          refreshCaptcha(form);
        })
        .then(function () {
          if (btn) btn.disabled = false;
        });
    }, true);
  }

  function wireInquiryButton() {
    var btn = document.getElementById("fixedInquiryBtn");
    if (!btn) return;
    var existing = btn.querySelector("a");
    if (existing) {
      existing.setAttribute("href", FORM_PAGE);
      return;
    }
    var inner = btn.querySelector("button");
    if (!inner) return;
    var link = document.createElement("a");
    link.href = FORM_PAGE;
    link.textContent = (inner.textContent || "Quick Inquiry").replace(/\s+/g, " ").trim();
    inner.parentNode.replaceChild(link, inner);
    btn.onclick = null;
    btn.removeAttribute("onclick");
  }

  function injectPageForm() {
    var kind = pageKind();
    if (kind === "inquiry" || kind === "career") return;
    if (document.querySelector(".page_content form.wpcf7-form")) return;
    if (document.getElementById("sf-page-form")) return;
    var host = document.createElement("div");
    host.id = "sf-page-form";
    host.className = "sf-page-form";
    host.innerHTML = formMarkup(kind, "sf-" + kind + "-form");
    var emptyWrap = document.querySelector(".page_content .vc_col-sm-6 .wpb_wrapper:empty");
    if (emptyWrap) emptyWrap.appendChild(host);
    else {
      var content = document.querySelector(".page_content .container") || document.querySelector(".page_content") || document.body;
      content.appendChild(host);
    }
    bindForm(host.querySelector("form"), kind);
  }

  function activateExistingForms() {
    var forms = document.querySelectorAll("form.wpcf7-form");
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      var isCareer = !!form.querySelector('input[name="resume"]');
      var inPopup = !!(form.closest(".pum, .popmake, .pum-container"));
      if (inPopup) continue;
      bindForm(form, isCareer ? "career" : pageKind() === "inquiry" ? "contact" : pageKind());
    }
  }

  ready(function () {
    ensureStyles();
    pinInquiryButton();
    wireInquiryButton();
    injectPageForm();
    activateExistingForms();
    setInterval(function () {
      pinInquiryButton();
      window.sfOpenInquiry = function () {
        location.href = FORM_PAGE;
      };
      if (typeof window.PUM === "object") {
        window.PUM.open = function () {
          location.href = FORM_PAGE;
        };
      }
    }, 800);
    window.sfOpenInquiry = function () {
      location.href = FORM_PAGE;
    };
    if (typeof window.PUM === "object") {
      window.PUM.open = function () {
        location.href = FORM_PAGE;
      };
    }
  });
})();
