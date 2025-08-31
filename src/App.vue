<template>
  <div class="chat-box">
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
        <t-chat-input :stop-disabled="isStreamLoad" @send="inputEnter" @stop="onStop"></t-chat-input>
      </template>
    </t-chat>
    <t-button v-show="isShowToBottom" variant="text" class="bottomBtn" @click="backBottom">
      <div class="to-bottom">
        <ArrowDownIcon/>
      </div>
    </t-button>
  </div>
</template>
<script setup lang="jsx">
import {ref} from 'vue';
import {ArrowDownIcon, CheckCircleIcon} from 'tdesign-icons-vue-next';

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
    reasoning: '',
    content: '它叫 McMurdo Station ATM，是美国富国银行安装在南极洲最大科学中心麦克默多站的一台自动提款机。',
    role: 'assistant',
    duration: 10,
  },
  {
    avatar: 'https://tdesign.gtimg.com/site/avatar.jpg',
    name: '自己',
    datetime: '今天16:38',
    content: '南极的自动提款机叫什么名字？',
    role: 'user',
    reasoning: '',
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
/* 应用滚动条样式 */
::-webkit-scrollbar-thumb {
  background-color: var(--td-scrollbar-color);
}

::-webkit-scrollbar-thumb:horizontal:hover {
  background-color: var(--td-scrollbar-hover-color);
}

::-webkit-scrollbar-track {
  background-color: var(--td-scroll-track-color);
}

.chat-box {
  position: relative;

  .bottomBtn {
    position: absolute;
    left: 50%;
    margin-left: -20px;
    bottom: 210px;
    padding: 0;
    border: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    box-shadow: 0px 8px 10px -5px rgba(0, 0, 0, 0.08), 0px 16px 24px 2px rgba(0, 0, 0, 0.04),
    0px 6px 30px 5px rgba(0, 0, 0, 0.05);
  }

  .to-bottom {
    width: 40px;
    height: 40px;
    border: 1px solid #dcdcdc;
    box-sizing: border-box;
    background: var(--td-bg-color-container);
    border-radius: 50%;
    font-size: 24px;
    line-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;

    .t-icon {
      font-size: 24px;
    }
  }
}

.model-select {
  display: flex;
  align-items: center;

  .t-select {
    width: 112px;
    height: 32px;
    margin-right: 8px;

    .t-input {
      border-radius: 32px;
      padding: 0 15px;
    }
  }

  .check-box {
    width: 112px;
    height: 32px;
    border-radius: 32px;
    border: 0;
    background: #e7e7e7;
    color: rgba(0, 0, 0, 0.9);
    box-sizing: border-box;
    flex: 0 0 auto;

    .t-button__text {
      display: flex;
      align-items: center;
      justify-content: center;

      span {
        margin-left: 4px;
      }
    }
  }

  .check-box.is-active {
    border: 1px solid #d9e1ff;
    background: #f2f3ff;
    color: var(--td-brand-color);
  }
}
</style>
