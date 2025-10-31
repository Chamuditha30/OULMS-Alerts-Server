const { closeBrowser } = require("../helpers/browser");
const {
  loginWithCookie,
  getCourses,
  getCourseAnnouncements,
} = require("../helpers/lmsFunctions");

//create main funtion for manage abnd run all funtions
const main = async (req, res) => {
  try {
    //get the cookie from reqesy body
    const { cookie } = req.body;

    //login into lms
    const page = await loginWithCookie(cookie);

    //validate login session
    if (!page) {
      return res
        .status(400)
        .json({ message: "Invalid or expired MoodleSession cookie" });
    }

    //get all courses
    const { courses, page: samePage } = await getCourses(page);

    //get each course announcements
    const allCoursesAnnouncements = await getCourseAnnouncements(
      courses,
      samePage
    );

    //close the browser
    await closeBrowser();

    //return final results
    return res.status(200).json({
      message: "Scrapping successfully",
      announcements: allCoursesAnnouncements,
    });
  } catch (error) {
    //close the browser
    await closeBrowser();
    console.error("Main error: ", error);
    return res.status(500).json({ message: "Server error: ", error });
  }
};

module.exports = { main };
