<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import HeroCaption from "./demo/HeroCaption.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #home-hero-image>
      <HeroCaption />
    </template>
  </Layout>
</template>
