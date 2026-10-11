/* Skeleton loading placeholders (shimmer is a transform animation, so it is cheap). */
const Sk = {
  props: { w: { type: String, default: '100%' }, h: { type: String, default: '14px' }, round: Boolean },
  template: `<div class="skel" :class="{round}" :style="{width:w,height:h}"></div>`,
};
// Placeholder for a calculator result: stat tiles + a chart block.
const SkResult = {
  components: { Sk },
  template: `<div aria-busy="true"><div class="grid g4" style="margin:10px 0">
    <div v-for="i in 4" :key="i" class="tile"><Sk h="26px" w="60%"/><Sk h="11px" w="80%"/></div></div><Sk h="260px"/></div>`,
};
const SkCard = {
  components: { Sk },
  props: { lines: { type: Number, default: 3 } },
  template: `<div class="card"><div class="sk-lines"><Sk h="18px" w="40%"/><Sk v-for="i in lines" :key="i" h="12px" :w="(90 - i*12)+'%'"/></div></div>`,
};
// Whole-page placeholder shown until the first data load completes.
const SkeletonPage = {
  components: { Sk, SkCard },
  props: ['view'],
  template: `<div class="sk-page" aria-busy="true">
    <Sk h="28px" w="200px" style="margin-bottom:18px"/>
    <template v-if="view==='dashboard'">
      <div class="grid g4" style="margin-bottom:16px"><div v-for="i in 6" :key="i" class="tile"><Sk h="26px" w="50%"/><Sk h="11px" w="75%"/></div></div>
      <div class="grid g2"><SkCard v-for="i in 4" :key="i" :lines="4"/></div>
    </template>
    <template v-else-if="view==='notes'">
      <div class="sk-notes">
        <div><Sk h="38px" style="margin-bottom:12px"/><div v-for="i in 5" :key="i" class="card" style="padding:12px"><div class="sk-lines"><Sk h="14px" w="60%"/><Sk h="10px"/></div></div></div>
        <div class="card" style="height:60vh"><div class="sk-lines"><Sk h="26px" w="45%"/><Sk h="12px"/><Sk h="12px" w="92%"/><Sk h="12px" w="80%"/><Sk h="12px" w="88%"/></div></div>
      </div>
    </template>
    <template v-else>
      <div class="row" style="margin-bottom:16px"><Sk v-for="i in 4" :key="i" h="32px" w="110px"/></div>
      <div class="card"><div class="sk-lines"><Sk h="18px" w="35%"/><Sk h="12px" w="70%"/><div class="grid g4"><Sk v-for="i in 4" :key="i" h="40px"/></div><Sk h="240px"/></div></div>
    </template>
  </div>`,
};
