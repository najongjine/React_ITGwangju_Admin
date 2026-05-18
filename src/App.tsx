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
import UserPasswordReset from "./Pages/UserPasswordReset";
import NoticeList from "./Pages/NoticeList";
import NoticeDetail from "./Pages/NoticeDetail";
import NoticeForm from "./Pages/NoticeForm";
import InquiryList from "./Pages/InquiryList";
import InquiryDetail from "./Pages/InquiryDetail";
import UserList from "./Pages/UserList";
import UserDetail from "./Pages/UserDetail";

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
          <Route path="/notices" element={<NoticeList />} />
          <Route path="/notices/new" element={<NoticeForm />} />
          <Route path="/notices/:id" element={<NoticeDetail />} />
          <Route path="/notices/:id/edit" element={<NoticeForm />} />
          <Route path="/inquiries" element={<InquiryList />} />
          <Route path="/inquiries/:id" element={<InquiryDetail />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/users/password-reset" element={<UserPasswordReset />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/components" element={<ComponentGuide />} />
          <Route path="/contextapi_test" element={<ContextAPI_Test />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  );
}

export default App;
