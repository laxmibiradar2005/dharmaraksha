# Graph Report - nexus-mcp  (2026-04-24)

## Corpus Check
- 63 files · ~105,120 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1538 nodes · 5017 edges · 40 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 119 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]

## God Nodes (most connected - your core abstractions)
1. `constructor()` - 130 edges
2. `set()` - 129 edges
3. `push()` - 109 edges
4. `copy()` - 83 edges
5. `l()` - 71 edges
6. `i()` - 68 edges
7. `get()` - 56 edges
8. `tc()` - 54 edges
9. `G()` - 48 edges
10. `max()` - 44 edges

## Surprising Connections (you probably didn't know these)
- `getSessionMeta()` --calls--> `get()`  [INFERRED]
  agents\pipeline.ts → dashboard\assets\index-BSUmwWNd.js
- `initTelegramBot()` --calls--> `On()`  [INFERRED]
  bot\telegram.ts → dashboard\assets\index-BSUmwWNd.js
- `initWebSocket()` --calls--> `On()`  [INFERRED]
  lib\websocket.ts → dashboard\assets\index-BSUmwWNd.js
- `run()` --calls--> `get()`  [INFERRED]
  check_oauth.js → dashboard\assets\index-BSUmwWNd.js
- `test()` --calls--> `saveDocumentToFile()`  [INFERRED]
  test_docgen.ts → lib\documentGenerator.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (17): convertArray(), curveRadius(), equ(), flattenJSON(), fromHalfFloat(), getKeyframeOrder(), getObjectsByProperty(), getTransferables() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (198): a(), aa(), abort(), ac(), ai(), al(), Ao(), apply() (+190 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (156): CameraController(), add(), addLayerUpdate(), addLevel(), addScalar(), addScaledSH(), addScaledVector(), addVectors() (+148 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (143): accumulate(), accumulateAdditive(), applyAxisAngle(), applyClipRect(), applyEuler(), applyQuaternion(), attach(), baseHeight() (+135 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (110): run(), addEventListener(), addGeometry(), af(), ap(), autoReset(), bd(), bf() (+102 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (59): extractJSON(), getMaxTokens(), runAgent(), agentEmoji(), handleEvent(), processVoiceNote(), parseDualOutput(), runDevilsAdvocateAgent() (+51 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (73): addPass(), _allocateTargets(), am(), _applyGGXFilter(), _applyPMREM(), blitDepthBuffer(), _blur(), bp() (+65 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (58): addInstance(), array(), ceil(), computeBoneTexture(), connect(), constructor(), disconnect(), Do() (+50 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (50): addGroup(), bindLightTargets(), bindSkeletons(), createMaterialFromType(), dn(), fromArray(), fromJSON(), G() (+42 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (50): ad(), Au(), Be(), bind(), calculateInverses(), cd(), Cu(), Du() (+42 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (31): absarc(), absellipse(), arc(), bn(), cn(), convertLinearToSRGB(), convertSRGBToLinear(), copyLinearToSRGB() (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (31): addUpdateRange(), conjugate(), copySampleValue_(), evaluate(), getSettings_(), getValueSize(), InterpolantFactoryMethodBezier(), InterpolantFactoryMethodDiscrete() (+23 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (23): executeComposioAction(), getConnectedAccountId(), logToGoogleSheets(), runComposioSaves(), saveToGoogleDrive(), scheduleCalendarEvent(), sendGmailAlert(), sendReportEmail() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (23): _activateAction(), _addInactiveAction(), _addInactiveBinding(), _bindAction(), clipAction(), _deactivateAction(), existingAction(), findByName() (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (21): ah(), bh(), bm(), dh(), gm(), _h(), hh(), hm() (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (15): __(), Bv(), commitUpdate(), Fg(), Ig(), iv(), Lg(), Mg() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (13): appendChildToContainer(), Cv(), ev(), getDelta(), getElapsedTime(), Mv(), play(), Pv() (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (11): deleteGeometry(), deleteInstance(), getColorAt(), getGeometryIdAt(), getGeometryRangeAt(), getVisibleAt(), setGeometryIdAt(), setMatrixAt() (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (9): clearViewOffset(), getFilmHeight(), getFilmWidth(), getFocalLength(), makeOrthographic(), makePerspective(), setFocalLength(), setViewOffset() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.32
Nodes (8): crossFadeFrom(), crossFadeTo(), fadeIn(), fadeOut(), halt(), _lendControlInterpolant(), _scheduleFading(), warp()

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (7): inputColorSpace(), outputColorSpace(), setAttributes(), setChanged(), setFragmentShader(), setVertexShader(), technique()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (6): lerpHSL(), lr(), mn(), offsetHSL(), pn(), setHSL()

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (6): Bb(), Hy(), Mb(), Py(), sb(), Wy()

### Community 23 - "Community 23"
Cohesion: 0.8
Nodes (5): draw_cover_page(), get_labels(), has_indic_chars(), is_indic(), render_pdf()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): adoptCameraSettings(), copyCameraSettings(), mainCamera()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): ab(), ob(), Xy()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (3): customDepthMaterial(), customDistanceMaterial(), mx()

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (2): getAverageFrequency(), getFrequencyData()

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): area(), isClockWise()

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (2): _setAdditiveIdentityNumeric(), _setAdditiveIdentityQuaternion()

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (2): setFromSpherical(), setFromSphericalCoords()

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (2): setFromCartesianCoords(), setFromVector3()

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): Fh(), Mh()

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (2): ax(), createDerivedMaterial()

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (2): setFromCylindrical(), setFromCylindricalCoords()

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (2): Qn(), yd()

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): getFilter(), getFilters()

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (2): ar(), sr()

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (2): insertInContainerBefore(), tv()

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): hr(), mr()

## Knowledge Gaps
- **Thin community `Community 40`** (2 nodes): `getAverageFrequency()`, `getFrequencyData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `area()`, `isClockWise()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `_setAdditiveIdentityNumeric()`, `_setAdditiveIdentityQuaternion()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `setFromSpherical()`, `setFromSphericalCoords()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `setFromCartesianCoords()`, `setFromVector3()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `Fh()`, `Mh()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `ax()`, `createDerivedMaterial()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `setFromCylindrical()`, `setFromCylindricalCoords()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `Qn()`, `yd()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `getFilter()`, `getFilters()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `ar()`, `sr()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `insertInContainerBefore()`, `tv()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `hr()`, `mr()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `trim()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `get()` connect `Community 4` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 12`, `Community 14`, `Community 20`, `Community 23`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `set()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 44`, `Community 12`, `Community 15`, `Community 20`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `set()` (e.g. with `runPipeline()` and `startInvestigation()`) actually correct?**
  _`set()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `push()` (e.g. with `runResearchAgent()` and `handleEvent()`) actually correct?**
  _`push()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._