"use client";
import { useGLTF } from "@react-three/drei";
import { redirect } from "next/navigation";
import { useEffect } from "react";

const Page = () => {
  useEffect(() => {
    useGLTF.preload("/models/earth.glb");
  });
  redirect("/explore");
};

export default Page;
