// Classic worker: MediaPipe's pinned WASM loader uses importScripts.
const ROOT='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
let detector;
self.onmessage=async({data})=>{
  if(data.type==='init'){
    try {
      self.postMessage({type:'status',message:'Loading movement model…'});
      const {FilesetResolver,PoseLandmarker}=await import(`${ROOT}/vision_bundle.mjs`);
      const files=await FilesetResolver.forVisionTasks(`${ROOT}/wasm`);
      const options={baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numPoses:data.players,outputSegmentationMasks:data.cutout,minPoseDetectionConfidence:.45,minPosePresenceConfidence:.45,minTrackingConfidence:.5};
      let delegate='GPU';
      try {detector=await PoseLandmarker.createFromOptions(files,{...options,canvas:new OffscreenCanvas(1,1)});}
      catch {delegate='CPU';detector=await PoseLandmarker.createFromOptions(files,{...options,baseOptions:{...options.baseOptions,delegate:'CPU'}});}
      self.postMessage({type:'ready',delegate});
    } catch(error){self.postMessage({type:'error',message:`Model could not load. Check your connection or browser settings. ${error.message}`});}
  }
  if(data.type==='frame'&&detector){
    let result;
    try {
      const start=performance.now();
      result=detector.detectForVideo(data.frame,data.timestamp);
      let mask=null,width=0,height=0;
      if(result.segmentationMasks?.length){
        width=result.segmentationMasks[0].width;height=result.segmentationMasks[0].height;
        const count=width*height;mask=new Uint8ClampedArray(count*4);
        for(const m of result.segmentationMasks){
          const values=m.getAsFloat32Array();
          for(let i=0;i<count;i++){const alpha=Math.max(0,Math.min(1,(values[i]-.25)/.5))*255;mask[4*i+3]=Math.max(mask[4*i+3],alpha);}
        }
      }
      const transfer=[data.frame];if(mask)transfer.push(mask.buffer);
      self.postMessage({type:'result',frame:data.frame,mask,width,height,landmarks:result.landmarks,ms:performance.now()-start,stamp:data.timestamp},transfer);
    } catch(error){data.frame.close();self.postMessage({type:'error',message:`Tracking stopped: ${error.message}`});}
    finally{result?.close();}
  }
};
