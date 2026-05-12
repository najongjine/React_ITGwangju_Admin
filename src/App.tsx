import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./Pages/Home";
import Header from "./Component/Header";
import Footer from "./Component/Footer";
import Maze from "./Pages/Maze";
import ContextAPI_Test from "./Pages/ContextAPI_Test";
import Login from "./Pages/Login";
import ComponentGuide from "./Pages/ComponentGuide";
import CourseList from "./Pages/CourseList";
import CourseDetail from "./Pages/CourseDetail";
import CourseForm from "./Pages/CourseForm";

function App() {
  return (
    <>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/maze" element={<Maze />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login initialMode="signup" />} />
          <Route path="/courses" element={<CourseList />} />
          <Route path="/courses/new" element={<CourseForm />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/courses/:id/edit" element={<CourseForm />} />
          <Route path="/components" element={<ComponentGuide />} />
          <Route path="/contextapi_test" element={<ContextAPI_Test />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  );
}

export default App;
