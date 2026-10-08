// GEO-02B synthetic pre-admission qualification; NO provider I/O.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BasemapContractError,
  createBasemapController,
  inspectBasemapStyleReferences,
  validateBasemapDescriptor,
  type BasemapAssetKind,
  type BasemapDescriptor,
  type BasemapHealth,
} from "@zyara/geospatial";

const origin = "https://tiles.example.org";
const digest = "c".repeat(64);
function descriptor(override: Partial<BasemapDescriptor> = {}): BasemapDescriptor {
  return {
    id: "synthetic-basemap",
    providerId: "synthetic-provider",
    admission: "disabled",
    style: {
      url: origin + "/styles/city-v1/style.json",
      version: "city-v1",
      sha256: digest,
      immutable: true,
    },
    tileVersion: "tiles-v1",
    origins: {
      style: [origin],
      tile: [origin],
      glyph: [origin],
      sprite: [origin],
      asset: [origin],
    },
    attribution: {
      label: "Synthetic Map | Synthetic Data",
      licenseUrls: ["https://licensing.example.org/data"],
    },
    policy: {
      termsUrl: "https://legal.example.org/terms",
      privacyUrl: "https://legal.example.org/privacy",
      retentionReview: "SYNTHETIC_REVIEW_ONLY",
      maxRequestsPerView: 5,
      timeoutMs: 3500,
      maxCacheAgeSeconds: 3600,
      egress: "public_area_only",
    },
    ...override,
  };
}

function code(action: () => unknown, expected: string): void {
  assert.throws(action, (e: unknown) =>
    e instanceof BasemapContractError && e.code === expected, expected);
}

describe("GEO-02B provider-neutral basemap contract", () => {
  it("accepts strict synthetic pinned descriptors, never admits a provider by default", () => {
    const d = validateBasemapDescriptor(descriptor());
    assert.equal(d.style.version, "city-v1");
    const controller = createBasemapController(d, "production");
    assert.deepEqual(controller.decide(), {
      available: false, reason: "disabled", attribution: "Synthetic Map | Synthetic Data",
    });
    code(() => controller.guardAsset("style", d.style.url), "BASEMAP_PROVIDER_DISABLED");
    assert.equal(controller.requestCount(), 0);
  });

  it("fails closed for mutable/unpinned style, missing attribution, wildcard origins and unsafe policies", () => {
    code(() => validateBasemapDescriptor(descriptor({style:{
      url: origin + "/style", version: "", sha256: digest, immutable: true,
    }})), "BASEMAP_STYLE_UNVERIFIED");
    code(() => validateBasemapDescriptor(descriptor({style:{
      url: origin + "/style", version: "x", sha256: "unknown", immutable: true,
    }})), "BASEMAP_STYLE_UNVERIFIED");
    code(() => validateBasemapDescriptor(descriptor({style:{
      url: origin + "/style", version: "x", sha256: digest, immutable: false,
    }})), "BASEMAP_STYLE_UNVERIFIED");
    code(() => validateBasemapDescriptor(descriptor({attribution:{
      label: "", licenseUrls: [],
    }})), "BASEMAP_DESCRIPTOR_INVALID");
    code(() => validateBasemapDescriptor(descriptor({origins:{
      style:["https://*.example.org"], tile:[origin], glyph:[origin], sprite:[origin], asset:[origin],
    }})), "BASEMAP_REQUEST_INVALID");
    code(() => validateBasemapDescriptor(descriptor({policy:{
      ...descriptor().policy, egress:"public_area_only", timeoutMs:999_999,
    }})), "BASEMAP_DESCRIPTOR_INVALID");
  });

  it("requires intentional development mode and healthy state, never production fallback", () => {
    const d = descriptor({admission:"development_only"});
    const prod = createBasemapController(d,"production");
    prod.setHealth("healthy");
    assert.deepEqual(prod.decide(), {
      available:false,reason:"development-only",attribution:d.attribution.label,
    });
    code(() => prod.guardAsset("tile",origin+"/tiles/10/4/3.pbf"),"BASEMAP_NOT_ADMITTED");

    const dev=createBasemapController(d,"development");
    assert.deepEqual(dev.decide(), {
      available:false,reason:"provider-unhealthy",attribution:d.attribution.label,
    });
    dev.setHealth("healthy");
    assert.deepEqual(dev.decide(), {
      available:true,styleUrl:d.style.url,attribution:d.attribution.label,
    });
    assert.equal(dev.guardAsset("style",d.style.url),d.style.url);
    dev.setKilled(true);
    assert.equal(dev.decide().available,false);
    code(() => dev.guardAsset("tile",origin+"/tiles/10/4/3.pbf"),"BASEMAP_PROVIDER_DISABLED");
    dev.setKilled(false);
    dev.setHealth("unavailable");
    code(() => dev.guardAsset("tile",origin+"/tiles/10/4/3.pbf"),"BASEMAP_PROVIDER_UNAVAILABLE");
    assert.equal(dev.requestCount(),1);
  });

  it("rejects origin, user info, query/context leakage, redirects and non-HTTPS schemes", () => {
    const d=descriptor({admission:"development_only"});
    const controller=createBasemapController(d,"development");
    controller.setHealth("healthy");
    const unsafe=[
      ["tile","https://other.example.org/tiles/12/3/4.pbf","BASEMAP_ORIGIN_DENIED"],
      ["tile","https://tiles.example.org.evil.com/foo","BASEMAP_ORIGIN_DENIED"],
      ["tile","http://tiles.example.org/foo","BASEMAP_REQUEST_INVALID"],
      ["tile","https://tiles.example.org/?patient=123","BASEMAP_REQUEST_INVALID"],
      ["tile","https://user:secret@tiles.example.org/foo","BASEMAP_REQUEST_INVALID"],
      ["tile","https://tiles.example.org/foo#fragment","BASEMAP_REQUEST_INVALID"],
      ["tile","data:text/plain,hi","BASEMAP_REQUEST_INVALID"],
      ["tile","blob:https://tiles.example.org/bar","BASEMAP_REQUEST_INVALID"],
      ["sprite","https://other.example.org/sprite.png","BASEMAP_ORIGIN_DENIED"],
    ] as const;
    for(const [kind,url,expected] of unsafe){
      code(()=>controller.guardAsset(kind,url),expected);
    }
    assert.equal(controller.requestCount(),0);
    assert.equal(controller.guardRedirect("tile",origin+"/tiles/0/0/0.pbf"),origin+"/tiles/0/0/0.pbf");
    assert.equal(controller.requestCount(),1);
  });

  it("enforces per-view request cap and provider outage, without inventing fallback imagery", () => {
    const d=descriptor({admission:"admitted",policy:{...descriptor().policy,maxRequestsPerView:2}});
    const c=createBasemapController(d,"production");
    c.setHealth("healthy");
    c.guardAsset("tile",origin+"/1/2/3");
    c.guardAsset("tile",origin+"/1/2/4");
    assert.deepEqual(c.decide(),{
      available:false,reason:"request-budget-exhausted",attribution:d.attribution.label,
    });
    code(()=>c.guardAsset("tile",origin+"/1/2/5"),"BASEMAP_REQUEST_BUDGET_EXCEEDED");
    assert.equal(c.requestCount(),2);
    c.setHealth("degraded");
    assert.equal(c.decide().available,false);
    c.setHealth("healthy");
    c.setKilled(true);
    assert.equal(c.decide().available,false);
  });

  it("inspects nested style references by kind and rejects rogue glyph/tile hosts", () => {
    const c=createBasemapController(descriptor({
      admission:"development_only",policy:{...descriptor().policy,maxRequestsPerView:20},
    }),"development");
    c.setHealth("healthy");
    const style={
      version:8, sources:{
        base:{type:"vector",tiles:[origin+"/tiles/{z}/{x}/{y}.pbf"]},
      },
      glyphs:origin+"/fonts/{fontstack}/{range}.pbf",
      sprite:origin+"/sprite",
      layers:[],
    };
    assert.equal(inspectBasemapStyleReferences(style,c),3);
    const withEgress={...style,glyphs:"https://unexpected.example.org/fonts"};
    code(()=>inspectBasemapStyleReferences(withEgress,c),"BASEMAP_ORIGIN_DENIED");
    code(()=>inspectBasemapStyleReferences({version:8,sources:{},layers:null},c),"BASEMAP_STYLE_UNVERIFIED");
  });

  it("pins an immutable admission snapshot against caller-side mutations", () => {
    const input = descriptor({admission:"development_only"});
    const controller = createBasemapController(input,"development");
    controller.setHealth("healthy");

    const oldUrl = input.style.url;
    // A framework may pass structurally typed, mutable runtime objects.
    (input as {admission: string}).admission = "disabled";
    (input.origins.tile as string[]).push("https://malicious.example.org");
    (input.policy as {maxRequestsPerView:number}).maxRequestsPerView = 200;
    (input.style as {url:string}).url = "https://malicious.example.org/changed";
    (input.attribution as {label:string}).label = "forged";

    assert.deepEqual(controller.decide(),{
      available:true,styleUrl:oldUrl,attribution:"Synthetic Map | Synthetic Data",
    });
    code(()=>controller.guardAsset("tile","https://malicious.example.org/1/2/3"),
      "BASEMAP_ORIGIN_DENIED");
    assert.equal(controller.requestCount(),0);
  });

  it("denies relative style asset URLs instead of silently resolving them", () => {
    const c=createBasemapController(descriptor({
      admission:"development_only",policy:{...descriptor().policy,maxRequestsPerView:20},
    }),"development");
    c.setHealth("healthy");
    code(()=>inspectBasemapStyleReferences({
      version:8, sources:{base:{type:"vector",tiles:["/relative/tiles/{z}/{x}/{y}.pbf"]}},
      layers:[],
    },c),"BASEMAP_REQUEST_INVALID");
    code(()=>inspectBasemapStyleReferences({
      version:8, sources:{base:{type:"vector",url:"./source.json"}},
      layers:[],
    },c),"BASEMAP_REQUEST_INVALID");
    assert.equal(c.requestCount(),0);
  });

  it("never accepts unknown asset kinds or invalid health transitions", () => {
    const c=createBasemapController(descriptor({admission:"development_only"}),"development");
    c.setHealth("healthy");
    code(()=>c.guardAsset("custom" as BasemapAssetKind,origin+"/tile"),"BASEMAP_REQUEST_INVALID");
    code(()=>c.setHealth("active" as BasemapHealth),"BASEMAP_DESCRIPTOR_INVALID");
  });
});
