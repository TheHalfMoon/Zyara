import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INITIAL_DISCOVERY_VIEW,
  DiscoveryContractError,
  buildSharedDiscoveryProjection,
  proposeDiscoveryViewport,
  searchDiscoveryArea,
  selectDiscoveryBranch,
  setDiscoveryMapAvailable,
  type DiscoveryRecord,
  type DiscoveryViewState,
} from "@zyara/geospatial";

function fixture(
  id: string,
  lat: number,
  lng: number,
  rank: number,
  overrides: Partial<DiscoveryRecord> = {},
): DiscoveryRecord {
  return {
    publicStatus: "public",
    locationStatus: "precise",
    specialties: ["Family Medicine"],
    insurers: ["payer-a"],
    sourceRank: rank,
    branch: {
      branchId: id,lat,lng,accuracyM:35,
      labels:{ar:"عيادة تجريبية "+id,en:"Synthetic Clinic "+id},
      insurerCaveat:null,verifiedScope:"PROVIDER_ATTESTED",
      observedAt:"2026-10-01T10:00:00Z",bookingMode:"request",
      wheelchairAccess:true,
    },
    ...overrides,
  };
}

const branches=[
  fixture("b3",24.80,46.80,3,{specialties:["Dermatology"]}),
  fixture("b1",24.71,46.67,1),
  fixture("b2",24.7105,46.6705,2),
  fixture("b-hidden",24.70,46.65,4,{publicStatus:"hidden"}),
  fixture("b-approx",24.74,46.72,5,{locationStatus:"approximate",branch:{
    ...fixture("b-approx",24.74,46.72,5).branch,accuracyM:900,
  }}),
  fixture("b-unknown",NaN,NaN,6,{locationStatus:"unknown",branch:{
    ...fixture("b-unknown",0,0,6).branch,accuracyM:null,verifiedScope:null,
  }}),
];

function ids(items: readonly {branchId:string}[]): string[] {
  return items.map(x=>x.branchId);
}

function invalid(fn:()=>unknown,code:string): void {
  assert.throws(fn,(e:unknown)=>e instanceof DiscoveryContractError && e.code===code);
}

describe("GEO-03A shared synthetic discovery contract",()=>{
  it("has one stable ranking for list and pins, never invents a pin for hidden/unknown/approximate",()=>{
    const p=buildSharedDiscoveryProjection(branches,{});
    assert.deepEqual(ids(p.list),["b1","b2","b3","b-approx","b-unknown"]);
    assert.deepEqual(ids(p.pins),["b1","b2","b3"]);
    assert.deepEqual(p.suppressedPinIds,["b-approx","b-unknown"]);
    assert.ok(p.pins.every(x=>p.list.some(l=>l.branchId===x.branchId)));
    assert.ok(!p.list.some(x=>x.branchId==="b-hidden"));
    assert.equal(p.list.find(x=>x.branchId==="b-approx")?.locationDisclosure,"approximate");
    assert.equal(p.list.find(x=>x.branchId==="b-unknown")?.locationDisclosure,"unknown");
  });

  it("preserves source ranking on pan and requires an explicit Search this area",()=>{
    const bounds={west:46.60,south:24.60,east:46.73,north:24.75};
    const pending=proposeDiscoveryViewport(INITIAL_DISCOVERY_VIEW,bounds);
    assert.deepEqual(ids(buildSharedDiscoveryProjection(branches,{},pending).list),
      ids(buildSharedDiscoveryProjection(branches,{},INITIAL_DISCOVERY_VIEW).list));
    assert.equal(buildSharedDiscoveryProjection(branches,{},pending).hasPendingAreaSearch,true);
    const committed=searchDiscoveryArea(pending);
    assert.equal(buildSharedDiscoveryProjection(branches,{},committed).hasPendingAreaSearch,false);
    assert.deepEqual(ids(buildSharedDiscoveryProjection(branches,{},committed).list),
      ["b1","b2","b-approx","b-unknown"]);
    assert.deepEqual(ids(buildSharedDiscoveryProjection(branches,{},committed).pins),["b1","b2"]);
    assert.equal(searchDiscoveryArea(INITIAL_DISCOVERY_VIEW),INITIAL_DISCOVERY_VIEW);
  });

  it("uses identical specialty, payer and accessibility filtering for map and list",()=>{
    const p=buildSharedDiscoveryProjection(branches,{specialty:"DERMATOLOGY"});
    assert.deepEqual(ids(p.list),["b3"]);
    assert.deepEqual(ids(p.pins),["b3"]);
    assert.deepEqual(ids(buildSharedDiscoveryProjection(branches,{insurer:"payer-z"}).list),[]);
    const inaccessible=fixture("b4",24.74,46.7,0,{branch:{
      ...fixture("b4",24.74,46.7,0).branch,wheelchairAccess:false,
    }});
    assert.ok(!ids(buildSharedDiscoveryProjection([inaccessible,...branches],{accessibleOnly:true}).list).includes("b4"));
  });

  it("keeps the accessible list when rendering fails; precise GPS is never required",()=>{
    const base=buildSharedDiscoveryProjection(branches,{});
    const failed=buildSharedDiscoveryProjection(branches,{},setDiscoveryMapAvailable(INITIAL_DISCOVERY_VIEW,false));
    assert.deepEqual(failed.list,base.list);
    assert.deepEqual(failed.pins,[]);
    assert.equal(failed.mapAvailable,false);
    assert.equal(buildSharedDiscoveryProjection(branches,{}).list.length,5);
  });

  it("shares selection by stable branch ID and clears stale selection after filtering",()=>{
    const selected=selectDiscoveryBranch(INITIAL_DISCOVERY_VIEW,"b2");
    const p=buildSharedDiscoveryProjection(branches,{},selected);
    assert.equal(p.selectedBranchId,"b2");
    assert.equal(p.list.filter(x=>x.selected).length,1);
    assert.equal(p.pins.filter(x=>x.selected).length,1);
    assert.equal(buildSharedDiscoveryProjection(branches,{specialty:"Dermatology"},selected).selectedBranchId,null);
    invalid(()=>selectDiscoveryBranch(INITIAL_DISCOVERY_VIEW,""),"DISCOVERY_INVALID_INPUT");
  });

  it("clusters only eligible pins deterministically, never hidden or approximate results",()=>{
    const p=buildSharedDiscoveryProjection(branches,{});
    assert.deepEqual(p.clusters,[{cell:"494:933",branchIds:["b1","b2"]}]);
    assert.deepEqual(buildSharedDiscoveryProjection([...branches].reverse(),{}).clusters,p.clusters);
  });

  it("rejects duplicate entities, bad rank, malformed viewport and precise radius",()=>{
    invalid(()=>buildSharedDiscoveryProjection([...branches,branches[1]],{}),"DISCOVERY_DUPLICATE_ID");
    invalid(()=>buildSharedDiscoveryProjection([fixture("negative",24,46,-1)],{}),"DISCOVERY_INVALID_INPUT");
    invalid(()=>proposeDiscoveryViewport(INITIAL_DISCOVERY_VIEW,{west:50,south:30,east:40,north:31}),
      "DISCOVERY_INVALID_INPUT");
    invalid(()=>buildSharedDiscoveryProjection(branches,{near:{lat:95,lng:46,radiusKm:2}}),
      "DISCOVERY_INVALID_INPUT");
  });

  it("never accepts a claimed precise pin without attested <=100m accuracy",()=>{
    const bad=fixture("unverified",24.71,46.67,0,{branch:{
      ...fixture("unverified",24.71,46.67,0).branch,
      accuracyM:150,verifiedScope:null,
    }});
    const view=buildSharedDiscoveryProjection([bad],{});
    assert.deepEqual(view.pins,[]);
    assert.deepEqual(view.suppressedPinIds,["unverified"]);
    assert.equal(view.list[0].locationDisclosure,"unknown");
    assert.deepEqual(buildSharedDiscoveryProjection([bad],{
      near:{lat:24.71,lng:46.67,radiusKm:2},
    }).list,[]);
  });

  it("optional local straight-line radius is explicitly not an ETA",()=>{
    const p=buildSharedDiscoveryProjection(branches,{near:{lat:24.71,lng:46.67,radiusKm:2}});
    assert.deepEqual(ids(p.list),["b1","b2"]);
    assert.equal(p.list[0].label,"عيادة تجريبية b1");
    assert.equal(buildSharedDiscoveryProjection(branches,{},INITIAL_DISCOVERY_VIEW,"en").list[0].label,
      "Synthetic Clinic b1");
  });

  it("does not mutate source fixtures or reusable viewport state",()=>{
    const before=JSON.stringify(branches);
    const state:DiscoveryViewState=proposeDiscoveryViewport(INITIAL_DISCOVERY_VIEW,
      {west:46.60,south:24.60,east:46.73,north:24.75});
    buildSharedDiscoveryProjection(branches,{},state);
    assert.equal(JSON.stringify(branches),before);
    assert.equal(state.searchedViewport,null);
  });
});
