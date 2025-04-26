
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AboutPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">About Washitek</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Leaders in architectural innovation and sustainable design.
            </p>
            <div className="mt-6 w-24 h-1 bg-primary mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div className="flex items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Vision</h2>
                <p className="text-gray-600 mb-6">
                  At Washitek, we believe in creating spaces that inspire and transform how people live, work, and interact. Our vision is to lead the architectural industry in innovative design that harmonizes aesthetics, functionality, and sustainability.
                </p>
                <p className="text-gray-600">
                  Founded in 2010, our award-winning firm has grown to become a trusted partner for clients seeking exceptional architectural solutions that stand the test of time.
                </p>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg h-[400px]">
              <div className="h-full bg-gradient-to-r from-washitek-300 to-washitek-400 flex items-center justify-center">
                <p className="text-white text-lg italic px-6 text-center">
                  "Architecture is not about building the impossible, which we can do if we have enough money and enough tools and enough computers. It's about building what is appropriate and about attaining beauty through such an approach."
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Our Core Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: "Innovation",
                  description: "We push the boundaries of design to create unique, forward-thinking solutions.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )
                },
                {
                  title: "Sustainability",
                  description: "We're committed to environmentally responsible design practices.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  title: "Collaboration",
                  description: "We work closely with clients to bring their unique vision to life.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )
                },
                {
                  title: "Excellence",
                  description: "We strive for perfection in every detail of our work.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )
                }
              ].map((value, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md text-center">
                  <div className="mx-auto flex items-center justify-center mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  name: "Alex Mitchell",
                  role: "Principal Architect",
                  bio: "With over 20 years of experience, Alex leads our design team with passion and creativity."
                },
                {
                  name: "Sarah Johnson",
                  role: "Design Director",
                  bio: "Sarah's innovative approach has earned her multiple industry awards for sustainable design."
                },
                {
                  name: "David Chen",
                  role: "Technical Director",
                  bio: "David ensures all our designs are technically sound and executed with precision."
                },
              ].map((person, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md text-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">{person.name}</h3>
                  <p className="text-primary font-medium mb-2">{person.role}</p>
                  <p className="text-gray-600">{person.bio}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <div className="bg-gradient-to-r from-washitek-300/20 to-washitek-400/20 p-8 rounded-lg text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to start your project?</h2>
              <p className="text-gray-600 mb-6">Contact us today to discuss how we can bring your architectural vision to life.</p>
              <a href="/" className="inline-block bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-md transition-all duration-300">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AboutPage;
