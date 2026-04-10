import { Room } from 'livekit-client';
const room = new Room();
room.connect("wss://my-comms-coach-cvijmjiz.livekit.cloud", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoicWFfdXNlciIsIm1ldGFkYXRhIjoie1widm9pY2VcIjogXCJBb2VkZVwiLCBcIm1pY19zZW5zaXRpdml0eVwiOiBcImhpZ2hcIiwgXCJzaWxlbmNlX2R1cmF0aW9uX21zXCI6IDEwMDB9IiwidmlkZW8iOnsicm9vbUpvaW4iOnRydWUsInJvb20iOiJ0ZXN0X2xvY2FsX3Jvb20iLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlfSwic3ViIjoicWFfdXNlciIsImlzcyI6IkFQSTc3M3daRGlTa2RHayIsIm5iZiI6MTc3NTc4NzMzMiwiZXhwIjoxNzc1ODA4OTMyfQ.UYI_zdAukBJpNuAimtypdJOI701mPJa_UdGK9PmY0GA").then(() => {
  console.log("Connected explicitly to room");
  setTimeout(() => process.exit(0), 10000);
});
