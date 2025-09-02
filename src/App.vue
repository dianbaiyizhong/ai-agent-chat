<template>
  <t-chat
      ref="chatRef"
      :clear-history="chatList.length > 0 && !isStreamLoad"
      :data="chatList"
      :text-loading="loading"
      :is-stream-load="isStreamLoad"
      style="height: 600px"
      @scroll="handleChatScroll"
      @clear="clearConfirm"
  >

    <template #content="{ item, index }">
      <t-chat-reasoning v-if="item.reasoning?.length > 0" expand-icon-placement="right">
        <template #header>
          <t-chat-loading v-if="isStreamLoad && item.content.length === 0" text="思考中..."/>
          <div v-else style="display: flex; align-items: center">
            <CheckCircleIcon style="font-size: 20px; margin-right: 8px;color: var(--td-success-color-5)"/>
            <span>{{ item.duration ? `已深度思考(用时${item.duration}秒)` : '已深度思考' }}</span>
          </div>
        </template>
        <t-chat-content v-if="item.reasoning.length > 0" :content="item.reasoning"/>
      </t-chat-reasoning>
      <t-chat-content v-if="item.content.length > 0" :content="item.content"/>


    </template>


    <template #actions="{ item, index }">
      <t-chat-action
          :content="item.content"
          :operation-btn="['good', 'bad', 'replay', 'copy']"
          @operation="handleOperation"
      />
    </template>
    <template #footer>
      <t-chat-sender
          v-model="inputValue"
          :textarea-props="{
      placeholder: '请输入消息...', }"
          :loading="isStreamLoad"
          :stop-disabled="isStreamLoad"
          @send="inputEnter"
          @stop="onStop"
      >
        <!-- 自定义操作区域的内容，默认支持图片上传、附件上传和发送按钮 -->
        <template #suffix="{ renderPresets }">
          <!-- 在这里可以进行自由的组合使用，或者新增预设 -->
          <!-- 不需要附件操作的使用方式 -->
          <component :is="renderPresets([])"/>
          <!-- 只需要附件上传的使用方式-->
          <!-- <component :is="renderPresets([{ name: 'uploadAttachment' }])" /> -->
          <!-- 只需要图片上传的使用方式-->
          <!-- <component :is="renderPresets([{ name: 'uploadImage' }])" /> -->
          <!-- 任意配置顺序-->
          <!-- <component :is="renderPresets([{ name: 'uploadAttachment' }, { name: 'uploadImage' }])" /> -->
        </template>
      </t-chat-sender>
    </template>
  </t-chat>
  <t-button v-show="isShowToBottom" variant="text" class="bottomBtn" @click="backBottom">
    <div class="to-bottom">
      <ArrowDownIcon/>
    </div>
  </t-button>
</template>
<script setup lang="jsx">
import {ref} from 'vue';
import {ArrowDownIcon, CheckCircleIcon} from 'tdesign-icons-vue-next';

const inputValue = ref('');

const fetchCancel = ref(null);
const loading = ref(false);
// 流式数据加载中
const isStreamLoad = ref(false);

const chatRef = ref(null);
const isShowToBottom = ref(false);
// 滚动到底部
const backBottom = () => {
  chatRef.value.scrollToBottom({
    behavior: 'smooth',
  });
};
// 是否显示回到底部按钮
const handleChatScroll = function ({e}) {
  const scrollTop = e.target.scrollTop;
  isShowToBottom.value = scrollTop < 0;
};
// 清空消息
const clearConfirm = function () {
  chatList.value = [];
};
const handleOperation = function (type, options) {
  console.log('handleOperation', type, options);
};
// 倒序渲染
const chatList = ref([
  {
    content: `模型由<span>hunyuan</span>变为<span>GPT4</span>`,
    role: 'model-change',
    reasoning: '',
  },
  {
    avatar: 'https://tdesign.gtimg.com/site/chat-avatar.png',
    name: 'TDesignAI',
    datetime: '今天16:38',
    reasoning: 'ssss',
    content: `你问我我问谁`,
    role: 'assistant',
    duration: 10,
    variant: 'outline'
  },
  {
    avatar: 'https://tdesign.gtimg.com/site/avatar.jpg',
    name: '自己',
    datetime: '今天16:38',
    content: '南极的自动提款机叫什么名字？',
    role: 'user',
    reasoning: '',
    variant: 'base'

  },
]);

const onStop = function () {
  if (fetchCancel.value) {
    fetchCancel.value.controller.close();
    loading.value = false;
    isStreamLoad.value = false;
  }
};

const inputEnter = function (inputValue) {
  if (isStreamLoad.value) {
    return;
  }
  if (!inputValue) return;
  const params = {
    avatar: 'https://tdesign.gtimg.com/site/avatar.jpg',
    name: '自己',
    datetime: new Date().toDateString(),
    content: inputValue,
    role: 'user',
  };
  chatList.value.unshift(params);
  // 空消息占位
  const params2 = {
    avatar: 'https://tdesign.gtimg.com/site/chat-avatar.png',
    name: 'TDesignAI',
    datetime: new Date().toDateString(),
    content: '',
    reasoning: '',
    role: 'assistant',
  };
  chatList.value.unshift(params2);
  handleData(inputValue);
};


const handleData = async () => {
  loading.value = true;
  isStreamLoad.value = true;
  const lastItem = chatList.value[0];

  const response = await fetch('http://localhost:8080/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const isThink = function (str) {
    return str.startsWith("think:");
  }

  const isTool = function (str) {
    return str.startsWith("tools:");
  }
  const isAnswer = function (str) {
    return str.startsWith("answer:");
  }


  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  try {
    while (true) {
      const {done, value} = await reader.read();

      if (done) {
        console.log('流式传输完成');
        break;
      }

      let chunk = decoder.decode(value, {stream: true});

      loading.value = false;
      if (isThink(chunk)) {
        chunk = chunk.substring(6);
        lastItem.reasoning += chunk;
      } else if (isTool(chunk)) {
        console.info(chunk)
        chunk = chunk.substring(6);
        lastItem.reasoning = lastItem.reasoning + "\n" + `\`\`\`json\n${chunk}\n\`\`\``

      } else if (isAnswer(chunk)) {
        chunk = chunk.substring(7);
        lastItem.content += chunk;
      }
      // 解码并处理数据块
      // console.info(chunk)
    }
  } finally {
    reader.releaseLock();
    lastItem.duration = 20;
    // 控制终止按钮
    isStreamLoad.value = false;
    loading.value = false;
  }

};
</script>
<style lang="less">

</style>
